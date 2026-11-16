# T08: Frozen-round variants: the `W_screen` class table, bracket-close re-rating (D-IG7) and the (c4) probe

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P2 (the `W_screen` table per level and area class; fail closed, IG-P-Q26), P3 (population rule: "(c4), probing one count below the first in-band hit before accepting"), §3 P2 ("the variant that re-rates when the bracket closes is a frozen-round arm (D-IG7)"), §5.1 stage 2; decisions D-V4-03 to D-V4-06, OD-P7 (IG-P-D4); review RV1-11, RV1-20 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T07b |
| Depends on | T07b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (synthetic cases; verification through the lock helper; the arms run in stage 2) |

## Goal

Stage 2 compares a fixed set of arms on fitting seeds. This task adds the last three mechanisms they need to the
prototype, each behind a parameter, and names the arms: the plan's default screen table by class (with the
screen-everywhere and no-screen arms), re-rating at bracket close, and the (c4) probe, all on the instrumented
`v4-link` base, plus the per-set prior and P5 arms on that same base.

## Authority and fixed points

- The class table of plan §3 P2, as the default arm: Hell 1, every board: none; Nightmare up to 144 cells: none
  (OD-P7); Nightmare 196 to 324 cells: 190 M; Nightmare 360 cells and more: none until both arms have run; every
  class the table does not list (Nightmare 145 to 195 and 325 to 359 cells, every other level): none (fail closed).
- D-IG7's other reading (previous pack's check-list, D-IG7): at bracket close, re-rate canonically the screen-capped
  probe one clue below the window count, from the shared allowance `rerateMax`.
- (c4): before the first in-band locate hit is accepted, rate one subset one clue below it; when both are in band
  the lower count is offered to the centre rule first.
- Event phases `close` and `below` and the ordinal bound 2,192 (D-V4-04, D-V4-06): the (c4) probe takes at most two
  ordinals (family subset, then a sample), as T02a's step 5 counts.
- D-V4-05: each mechanism acts only with its parameter (`IG.screenClasses`, `IG.rerate`, `IG.c4`), so the earlier arms
  keep their behaviour and ids; each new arm has its own algo id `gen-v4-proto:<arm id>`. Only Nightmare and Hell 1
  targets reach these mechanisms (D-V4-03).

## Scope

- Change: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (steps 1 to 3);
  `tools/ig-proto/self-test.mjs` (three `--v4` cases); `tools/ig-proto/README.md` (a section).
- Create: `tools/ig-proto/variants/fr-base.json`, `fr-screen.json`, `fr-none.json`, `fr-close.json`, `fr-c4.json`,
  `fr-ps.json`, `fr-p5.json` (step 4).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T08 --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T08 --label frozen`.
1. **Class table** in `ig-select-v4.js`:

   ```js
   /** @param {string | undefined} levelId @param {number} area @returns {string | null} The `W_screen` class. */
   export function screenClass(levelId, area) {
     if (levelId === 'hell-1') {
       return 'hell-1';
     }
     if (levelId !== 'nightmare') {
       return null;
     }
     if (area <= 144) {
       return 'n-small';
     }
     if (area >= 196 && area <= 324) {
       return 'n-mid';
     }
     return area >= 360 ? 'n-large' : null;
   }

   /** @returns {number | undefined} undefined without a table; DEDUCE.work for a null or unlisted class. */
   export function classW(table, levelId, area) {
     if (table === undefined || table === null) {
       return undefined;
     }
     const cls = screenClass(levelId, area);
     const w = cls === null ? null : table[cls] ?? null;
     return typeof w === 'number' && w > 0 && w < DEDUCE.work ? w : DEDUCE.work;
   }
   ```

   In `selectCluesV4`, `W` becomes `ctx.igW ?? classW(IG.screenClasses, ctx.target.id, activeCount(ctx.board)) ??
   IG.W[ctx.target.id] ?? IG.W.default`.
2. **Bracket close** (`IG.rerate === 'close'`): in phase A, right after the first `bisect();` (the one after the
   first `side(c0)` branch, before the `noWindow` tests), insert:

   ```js
   if (IG.rerate === 'close' && hit === null && !skipped && hiBelow !== null && loAbove !== null
     && hiBelow - loAbove === 1 && byCount.get(loAbove)?.screenCapped === true
     && byCount.get(loAbove)?.rerated !== true && call.rerates < rerateMax) {
     igPhase('close');
     const r = rerate(byCount.get(loAbove), 'close');
     byCount.set(loAbove, r);
     loc.close = { count: loAbove, side: r.dir, kind: r.kind };
     if (r.dir === 'in') {
       hit = loAbove;
       proof = 'closed-in';
       try {
         adopt(r);
       } catch (e) {
         if (e instanceof Final) {
           Object.assign(loc, { result: 'hit', hit, wc: hit, noWindowProof: proof });
         }
         throw e;
       }
     }
   }
   ```

   Move the declaration `let proof = null;` (the prototype's line 666, with its type comment on 665) above this block, which follows the first `bisect();` (the prototype's line 663). Without `IG.rerate === 'close'`
   the block does nothing.
3. **(c4)** (`IG.c4 === true`): `step(idx, phase)` gains, before its `afterProfile` call, when `phase === 'locate'`,
   `p.dir === 'in'`, `p.count > 1` and `loc.c4 === undefined`:

   ```js
   igPhase('below');
   let q = rateSubset(fam(p.count - 1), 'below');
   if (q === null) {
     q = rateSubset(sample(p.count - 1), 'below');
   }
   loc.c4 = { count: p.count - 1, side: q === null ? 'skip' : q.dir, kind: q === null ? null : q.kind };
   if (q !== null) {
     const doneBelow = afterProfile(q.kind === 'rated' ? q.cand : null);
     if (doneBelow !== null) {
       Object.assign(loc, { result: 'hit', hit: q.count, wc: q.count });
       throw new Final(doneBelow);
     }
   }
   igPhase('locate');
   ```

   then the existing `afterProfile` of the hit. `fam` is the `let` that T02a declares before `step` (RV1-11) and phase
   A assigns before its first `side`; the block runs only from phase A's `side`, so `fam` is always assigned there.
4. **Arms** (each `"files": []`, `"edits": []`, a one-line description naming this task):

   | Id | `extends` | `params` |
   |---|---|---|
   | `fr-base` | `["v4-link"]` | `{ "screenClasses": { "hell-1": null, "n-small": null, "n-mid": 190000000, "n-large": null }, "screenTable": "tab-default" }` |
   | `fr-screen` | `["fr-base"]` | `{ "screenClasses": { "hell-1": 380000000, "n-small": 190000000, "n-mid": 190000000, "n-large": 190000000 }, "screenTable": "tab-screen" }` |
   | `fr-none` | `["fr-base"]` | `{ "screenClasses": { "hell-1": null, "n-small": null, "n-mid": null, "n-large": null }, "screenTable": "tab-none" }` |
   | `fr-close` | `["fr-base"]` | `{ "rerate": "close" }` |
   | `fr-c4` | `["fr-base"]` | `{ "c4": true }` |
   | `fr-ps` | `["fr-base", "v4-ps"]` | `{}` |
   | `fr-p5` | `["fr-base", "v4-p5"]` | `{}` |

   The legacy arm of stage 2 is `log-link` (T06a).
5. **Self-test**: three cases (Tests table).
6. **README.md**: a section "## Frozen-round arms (V4-T08)": the class table and its fail-closed rule, the three
   mechanisms with their parameters, journal phases and `locate` fields (`close`, `c4`), the seven arms and the
   legacy arm.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `fr: class table` | `screenClass` and `classW` of the `fr-base` tree's `ig-select-v4.js` with the `fr-base` table; and `ensureTree` of the seven arms | `screenClass`: `('nightmare', 100)` `n-small`, `(…, 144)` `n-small`, `(…, 145)` null, `(…, 196)` `n-mid`, `(…, 324)` `n-mid`, `(…, 325)` null, `(…, 359)` null, `(…, 360)` `n-large`, `(…, 676)` `n-large`, `('hell-1', 196)` `hell-1`, `('master', 196)` null; `classW` on the default table: 196 gives 190,000,000, 144, 145, 360 and `hell-1` give 760,000,000; `classW(undefined, …)` undefined; the seven trees build; `fr-ps` params have `perSetPrior: true` and `screenTable: 'tab-default'`; `fr-p5` params have `callBudget.default` 2,000,000,000 |
| same | `fr: bracket-close re-rating (synthetic)` | `screen = (c) => (c <= 4 ? 'cap' : synthetic(100 - 10 * c))`, `canon = (c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c))`, prior null, `extra: { igW: 190000000 }`, once with `variant: 'fr-close'`, once with `variant: 'fr-base'` | `fr-close`: `counts('locate')` `[7, 1, 4, 5]`, `counts('close')` `[4]`, `end.locate.noWindowProof` `'closed-in'`, `result.clues.length` 4; `fr-base`: `counts('close')` empty, `result.clues.length` 4, and its `end.profiles` larger than `fr-close`'s |
| same | `fr: (c4) probe (synthetic)` | `f = (c) => (c <= 1 ? 'cap' : c === 2 ? synthetic(64) : c === 3 ? synthetic(61) : synthetic(100 - 10 * c))` for screen and canon, prior 3, `extra: { igW: 190000000 }`, once with `variant: 'fr-c4'`, once with `variant: 'fr-base'` | `fr-c4`: `counts('locate')` `[3]`, `counts('below')` `[2]`, `result.clues.length` 2, `end.locate.c4` deep-equals `{ count: 2, side: 'in', kind: 'rated' }`; `fr-base`: `result.clues.length` 3 and no `below` tuple |

How the expected values follow (band 55 to 70, centre 62.5, central half-width 3.75): in the bracket-close case the
locate rates 7 (30, below), 1 (cap, above), 4 (screen cap, above) and 5 (50, below), so the bracket closes at 4 and
5; the canonical rating of 4 is 60, central, and ends the call. In the (c4) case the hit at 3 (61) is central; the
(c4) probe at 2 (64) is central too and is offered first. If a run differs, report the journal's tuples
(`QUESTION:`); do not change an expected value.

## Documentation

`tools/ig-proto/README.md` (step 6).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; report the printed counts | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T08 verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T08')` (check-list §3.2) | root | every `--v4` case passes, exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\firewall.mjs check --task V4-T08 --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a production file, a variant of T02a to T07b, or the class table's values.
- `QUESTION:` when an earlier `--v4` case fails after this change (the three mechanisms act only with their
  parameters).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08-B01 | Stage 2's arms exist on one instrumented base: default table, screen everywhere, no screen, bracket close, (c4), per-set prior, P5; and the legacy arm | case 1; the README table | self-test output; README |
| T08-B02 | The screen table fails closed on unlisted classes | case 1 (`145`, `325`, `359`, `master`) | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08-T01 | Bracket-close re-rating draws from the shared allowance and acts only at a closed bracket with a screen-capped lower end | case 2; review | self-test output; diff |
| T08-T02 | (c4) uses at most two ordinals and is offered first | case 3; review | self-test output; diff |
| T08-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
