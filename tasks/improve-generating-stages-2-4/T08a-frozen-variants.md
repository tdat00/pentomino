# T08a: The four frozen variants, a candidate epoch

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1, §4.3 (one edit set, four parameter sets; composition; runtime classes; records; a candidate epoch), §6 T2, §8.2 T08; plan v4 stage 3 (N-V4-03); D-S24-09 to D-S24-14, D-S24-19, D-S24-22, D-S24-23; this pack's D-P24-01, D-P24-02; `data/frozen-round-v1.json` (`arms`, `comparatorDifferences`) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07c |
| Depends on | T07c (and T06a's `data/prior-s3-v1.json`, T06b's `p5-mode` and `ps-levels`, T07a/T07b's `live`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min of benchmark (one locked verification of about a minute) |

## Goal

Stage 4 measures four arms named in `data/frozen-round-v1.json`: `fr-frozen` (the freeze), `fr-frozen-none` (the freeze
without any screen) and their uncapped comparators. This task writes them as four variants that share one edit set and
differ only in parameters, and checks that they differ exactly as the matrix declares. Their trees are a candidate
epoch: `V4-S3P` (S03) proves them, T11 reads them, and T12b records them in `freeze.json`.

## Authority and fixed points

- D-P24-02 gives the parameters exactly (plan §4.1); the four manifests below are those parameters.
- `fr-frozen` extends `["fr-base", "v4-ps", "v4-p5", "live", "p5-mode", "ps-levels"]` (D-P24-01); its chain is `base >
  instr > log > v4 > link > v4-link > fr-base > v4-ps > v4-p5 > live > p5-mode > ps-levels > fr-frozen` (`lib/tree.mjs`
  `chainOf`: depth first, ancestors first, each once). Parameters merge in chain order and `paramFiles` override by name
  (`planTree`), so `fr-frozen`'s `prior` (`data/prior-s3-v1.json`) replaces `v4`'s `prior-v1`.
- Runtime classes (plan §4.3): `ig-select-v4.js` keeps four runtime classes (`screenClass`: `n-small` up to 144 cells,
  `n-mid` 196-324, `n-large` 360 and more, `hell-1`); the freeze's `n-mid` (196-256) and `n-upper` (257-324) both fall in
  the runtime `n-mid` at 190 M, `n-large` is 190 M, `n-small` and `hell-1` none. T08b checks it per comparator cell.
- The twins differ only in `callBudget`, `setAttemptsBound` and `liveDeadline` (`comparatorDifferences`); the budget
  and deadline table ids sit inside those parameters (D-P24-02). Null makes each inert: `igModeBudget` (T06b) leaves the
  context, `igSetBound` (`v4-p5`) does not fire, `igLiveOf` and `igBoundStart` (T07a, T07b) keep today's two timers.
- Algo ids are `gen-v4-proto:<variant>` (`v4.json` edit of `version.js`; D-V4-05); the longest,
  `gen-v4-proto:fr-frozen-none-uncapped`, has 36 characters (plan §4.3).
- A candidate epoch (plan §4.3, check-list §3.3): these four files are final only when T11 accepts the epoch and T12b
  records it; until then nothing else may depend on their tree ids except S03's proofs.
- `check-edits` was run on these manifests in memory (`bt-variants.mjs --draft`): 90 edits each, every touched module
  parses.

## Scope

- Create: `tools/ig-proto/variants/fr-frozen.json`, `fr-frozen-none.json`, `fr-frozen-uncapped.json`,
  `fr-frozen-none-uncapped.json`.
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `v4Cases`.
- Change: `tools/ig-proto/README.md`: the subsection `### The four frozen variants (T08a)` of `## The frozen family
  (stages 2 to 4 pack)`; the section `## Frozen-round arms (V4-T08)` gains one sentence pointing to it.
- Guards: G1, G2, G3 (the six files).

## Steps

1. Create the four files exactly:

   `tools/ig-proto/variants/fr-frozen.json`:

   ```json
   {
     "id": "fr-frozen",
     "extends": ["fr-base", "v4-ps", "v4-p5", "live", "p5-mode", "ps-levels"],
     "description": "Frozen arm (stages 2 to 4 pack T08a; plan v4 stage 3, N-V4-03; plan 4.1-4.5): the freeze with the screen by class (screen-s3-v1), the prior prior-s3-v1, the per-set prior on Hell 1, P5 by mode (budget-s3-v1) and the bound of 4, the live deadline (deadline-s3-v1), rescue re-rating, no (c4), no ranker, the reference kernel.",
     "edits": [],
     "files": [],
     "paramFiles": { "prior": "data/prior-s3-v1.json" },
     "params": {
       "priorTable": "prior-s3-v1",
       "screenTable": "screen-s3-v1",
       "screenClasses": { "hell-1": null, "n-small": null, "n-mid": 190000000, "n-large": 190000000 },
       "rerate": "rescue",
       "rerateMax": 4,
       "c4": false,
       "callBudget": { "id": "budget-s3-v1", "any": { "nightmare": 10000000000, "hell-1": 40000000000 }, "require": { "nightmare": 32000000000, "hell-1": 40000000000 } },
       "setAttemptsBound": 4,
       "liveDeadline": { "id": "deadline-s3-v1", "levels": ["nightmare", "hell-1"], "reserve": 0.6, "setStageCapMs": 46000, "generationStopMs": 115000, "responseBoundMs": 120000, "hostMarginMs": 1000 },
       "perSetLevels": ["hell-1"]
     }
   }
   ```

   `tools/ig-proto/variants/fr-frozen-none.json`:

   ```json
   {
     "id": "fr-frozen-none",
     "extends": ["fr-frozen"],
     "description": "Frozen arm (stages 2 to 4 pack T08a): fr-frozen with no screen in any class (screen-s3-none); everything else frozen.",
     "edits": [],
     "files": [],
     "params": {
       "screenTable": "screen-s3-none",
       "screenClasses": { "hell-1": null, "n-small": null, "n-mid": null, "n-large": null }
     }
   }
   ```

   `tools/ig-proto/variants/fr-frozen-uncapped.json`:

   ```json
   {
     "id": "fr-frozen-uncapped",
     "extends": ["fr-frozen"],
     "description": "Comparator (stages 2 to 4 pack T08a, RV3-04): fr-frozen without the call budget, the set-attempt bound and the live deadline (two separate timers as today).",
     "edits": [],
     "files": [],
     "params": { "callBudget": null, "setAttemptsBound": null, "liveDeadline": null }
   }
   ```

   `tools/ig-proto/variants/fr-frozen-none-uncapped.json`:

   ```json
   {
     "id": "fr-frozen-none-uncapped",
     "extends": ["fr-frozen-none"],
     "description": "Comparator (stages 2 to 4 pack T08a, RV3-04): fr-frozen-none without the call budget, the set-attempt bound and the live deadline (two separate timers as today).",
     "edits": [],
     "files": [],
     "params": { "callBudget": null, "setAttemptsBound": null, "liveDeadline": null }
   }
   ```

2. Build: `node tools\ig-proto\lib\tree.mjs build fr-frozen fr-frozen-none fr-frozen-uncapped fr-frozen-none-uncapped
   --label frozen --source-label "frozen 3fc65f4"` prints four `<id> <treeId> <copyDigest> built` lines;
   `check-edits --all` prints `ok fr-frozen: 90 edits match` and the same 90 for the three others (the 57 of `fr-base`,
   7 of `v4-ps`, 3 of `v4-p5`, 19 of `live`, 2 of `p5-mode`, 2 of `ps-levels`).
3. Append to `v4Cases` the case `fr: the four frozen variants and their differences`:

   ```js
   {
     name: 'fr: the four frozen variants and their differences',
     async run() {
       const ids = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
       /** @type {Record<string, any>} */
       const trees = {};
       for (const id of ids) {
         trees[id] = await ensureTree(id);
       }
       same(trees['fr-frozen'].chain, ['base', 'instr', 'log', 'v4', 'link', 'v4-link', 'fr-base', 'v4-ps', 'v4-p5', 'live', 'p5-mode', 'ps-levels', 'fr-frozen'], 'the chain of fr-frozen');
       const p = trees['fr-frozen'].params;
       same([p.priorTable, p.screenTable, p.rerate, p.rerateMax, p.c4, p.setAttemptsBound, p.perSetLevels, p.perSetPrior],
         ['prior-s3-v1', 'screen-s3-v1', 'rescue', 4, false, 4, ['hell-1'], true], 'fr-frozen: the scalar parameters');
       same(p.screenClasses, { 'hell-1': null, 'n-small': null, 'n-mid': 190000000, 'n-large': 190000000 }, 'fr-frozen: the classes');
       same(p.callBudget, { id: 'budget-s3-v1', any: { nightmare: 10000000000, 'hell-1': 40000000000 }, require: { nightmare: 32000000000, 'hell-1': 40000000000 } }, 'fr-frozen: the budget');
       same(p.liveDeadline, { id: 'deadline-s3-v1', levels: ['nightmare', 'hell-1'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 }, 'fr-frozen: the deadline');
       same([Object.keys(p.prior).length, p.prior['hell-1@400'].share, p.prior['nightmare@196'].caseId], [27, 0.368421, '14x14-nightmare'], 'fr-frozen: the prior table prior-s3-v1');
       const differs = (/** @type {string} */ a, /** @type {string} */ b) => {
         const A = trees[a].params;
         const B = trees[b].params;
         return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => k !== 'variant' && !isDeepStrictEqual(A[k], B[k])).sort();
       };
       same(differs('fr-frozen', 'fr-frozen-uncapped'), ['callBudget', 'liveDeadline', 'setAttemptsBound'], 'fr-frozen against its comparator');
       same(differs('fr-frozen-none', 'fr-frozen-none-uncapped'), ['callBudget', 'liveDeadline', 'setAttemptsBound'], 'fr-frozen-none against its comparator');
       same(differs('fr-frozen', 'fr-frozen-none'), ['screenClasses', 'screenTable'], 'the two screen arms');
       for (const id of ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']) {
         same([trees[id].params.callBudget, trees[id].params.setAttemptsBound, trees[id].params.liveDeadline], [null, null, null], `${id} is uncapped`);
       }
       /** @type {string[]} */
       const notes = [];
       for (const id of ids) {
         const { ALGO_ID } = await import(pathToFileURL(join(trees[id].root, 'core', 'engine', 'version.js')).href);
         assert(ALGO_ID === `gen-v4-proto:${id}` && ALGO_ID.length <= 36, `${id}: algo ${ALGO_ID}`);
         notes.push(`${id} ${trees[id].treeId} ${sha256(JSON.stringify(trees[id].params))}`);
       }
       process.stdout.write(`NOTE fr frozen trees (tree id, parameter hash): ${notes.join('; ')}\n`);
     },
   },
   ```

   (`isDeepStrictEqual` from `node:util`, `sha256` from `./lib/records.mjs`, `pathToFileURL` from `node:url`, `join`
   and `ensureTree` are imported by the file at the base, lines 24-43.)

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--v4`) | `fr: the four frozen variants and their differences` | the four trees | the chain of `fr-frozen`; its parameters as D-P24-02 (scalars, classes, budget, deadline; 27 prior cells, `hell-1@400` 0.368421); the twins differ only in `callBudget`, `liveDeadline`, `setAttemptsBound` (all three null in the uncapped); `fr-frozen` and `fr-frozen-none` only in `screenClasses`, `screenTable`; each algo `gen-v4-proto:<id>`, at most 36 characters; a `NOTE` line with the tree ids and parameter hashes |

## Documentation

README: the subsection `### The four frozen variants (T08a)`: the four arms and their roles (the freeze, the freeze
without screens, the two uncapped comparators of RV3-04), the composition, the parameters (D-P24-02, as a table), the
differences, "a candidate epoch until T12b records it"; in `## Frozen-round arms (V4-T08)`, one sentence: "The stage-4
arms of the matrix are written by the stages 2 to 4 pack (see `## The frozen family`)."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T08a --label frozen` | repository root, first | `firewall: snapshot of S24-T08a` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build fr-frozen fr-frozen-none fr-frozen-uncapped fr-frozen-none-uncapped --label frozen --source-label "frozen 3fc65f4"` | repository root | four `built` lines | 5 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; four `ok fr-frozen...: 90 edits match` lines | 3 min |
| check-list §3.1's selection block with `$Id = 'S24-T08a'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('fr: the four frozen variants and their differences')` | PowerShell 7 at the repository root | `PASS <n> fr: the four frozen variants and their differences`; the `NOTE fr frozen trees` line; `IG S24-T08a cases exit=0`; `cases: 1 passed, as required` | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T08a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the six files | 1 min |

## Stop points and questions

- Stop and report when a parameter differs from D-P24-02 or the twins differ in another parameter: the values are the
  plan's; never adjust them to pass.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08a-B01 | The four stage-4 arms exist with the frozen settings, and each comparator differs from the arm it judges only by the caps | the case | the PASS line, the NOTE |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08a-T01 | The four variants build with 84 matching edits each | `build`; `check-edits` | the lines |
| T08a-T02 | Parameters, differences and algo ids as the Tests table says; tree ids and parameter hashes reported | the case | the PASS and NOTE lines |
| T08a-T03 | The `v4` chain did not move; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the four tree ids and parameter hashes of
the NOTE line); each AC row with its evidence; the questions and rulings; the deviations; and the named items for
later.

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
