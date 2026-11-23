# S05: The stage-4 activation (S4-6 and `activate`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 S-5, §9 (S4-6); `tasks/improve-generating-v4/check-list.md` §3.4 (the go of `activate`, ruling of 2026-11-17; R4-07's two steps), T11e (`activate`); this pack's check-list §3.4 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S04 |
| Depends on | S04 (the live-deadline binding) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine 0 min (data only: `activate` measures nothing); S4-6, only if chosen, adds 58.00 / 72.50 formal counted minutes to `V4-S4`; developer 0 h |

## Goal

Turn the initial collection into the concrete plan `V4-S4` and the comparator template `V4-S4C.template.json`, once,
after the owner has decided the optional item S4-6 and authorized the activation; then ask him for `V4-S4`'s allowance
(S06), with no locked step before his second answer.

## Authority and fixed points

- **Two owner stops** (R4-07): first S4-6 (today's arm `log-link` on the five failing Nightmare cells, "an indication",
  58.00 / 72.50 formal; the SAs recommend no) and the authorization of the data-only `activate`; then, after the
  activation's printout, `V4-S4`'s allowance (S06).
- `activate` writes `docs/improve-generating/evidence/frozen/V4-S4/activation.json`, `tools/ig-proto/plans/V4-S4.json`
  and `tools/ig-proto/plans/V4-S4C.template.json` once and refuses an existing one (`manifest.mjs:1961`).
- The expected figures (the pack author's pure computation with `activation` and `activationPlans`,
  `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-s4.mjs`): without S4-6, 80 groups, 1,120 declared rows, 19
  comparator cells, both conditional boards activated (`24x24-hell-1` 5 of 5 valid reaching ten, `14x14-hell-1` 4 of 5),
  `V4-S4` 102 steps (84 locked), allocation 1,186 minutes, guard 1,481.858 counted minutes; with S4-6, 85 groups, 1,145
  declared rows, allocation 1,244 minutes, guard 1,554.328.

## Scope

- Create (by `activate`): the three files above.
- Do not change: any code or earlier record. Guards: G1, G2 (new files only).

## Steps

1. **The go checks** (check-list §3.4), each reported:
   1. the pilots: the count command of the v4 pack §3.4
      (`node -e "const fs=require('fs'),p=require('path');const d='docs/improve-generating/evidence/frozen/V4-S2/fr-base';const rows=fs.existsSync(d)?fs.readdirSync(d).filter(n=>n.endsWith('.runs.json')).flatMap(n=>JSON.parse(fs.readFileSync(p.join(d,n),'utf8')).rows):[];for(const c of ['24x24-hell-1','14x14-hell-1'])console.log(c+': '+new Set(rows.filter(r=>r.caseId===c&&r.rep>=0&&r.rep<=4).map(r=>r.rep)).size+' of 5 pilot reps published')"`)
      prints `24x24-hell-1: 5 of 5 pilot reps published` and `14x14-hell-1: 5 of 5 pilot reps published`;
   2. `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` and the four variants exist, and `node
      tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json
      --current fr-frozen,fr-frozen-none --label frozen --source-label "frozen 3fc65f4"` prints `binding: pass`;
   3. `git log --oneline c802fae..HEAD -- tools/ig-proto/data/frozen-round-v1.json tools/ig-proto/plans/V4-S4.universe.json`
      and `git status --short -- tools/ig-proto/data/frozen-round-v1.json tools/ig-proto/plans/V4-S4.universe.json` print
      nothing;
   4. `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"` prints `freeze: check pass (7
      checks; ...)` (its `record` check is `activate`'s own rule on the file).
2. **STOP 1: ask the owner** (Discord), and wait. Text to relay: "Stage 4 is ready to be set up. Two decisions: (1) the
   optional extra S4-6 runs today's generator on the five Nightmare cells that fail today, as an indication only; it adds
   about 58 counted minutes (up to 72.5 by the formal guard) to stage 4. (a) Skip it (recommended: it decides nothing);
   (b) include it. (2) Authorize the set-up: it only writes the plan of stage 4 and runs nothing; the run itself is a
   separate approval next. (a) Authorize (recommended); (b) not now." Record both answers and the message id.
3. **The activation** (only on an authorization): `node tools\ig-proto\manifest.mjs activate --collection initial --label
   frozen --source-label "frozen 3fc65f4"` (with `--approve-optional S4-6` only if the owner chose (b) for S4-6).
   Expected on stderr: `activate: wrote docs/improve-generating/evidence/frozen/V4-S4/activation.json`, `activate: wrote
   tools/ig-proto/plans/V4-S4.json`, `activate: wrote tools/ig-proto/plans/V4-S4C.template.json`; on stdout, without
   S4-6: `activation: 80 groups, 1120 declared rows, 19 comparator cells; conditional 24x24-hell-1: true (5 of 5 valid);
   conditional 14x14-hell-1: true (4 of 5 valid); optional approved none` and `V4-S4: allocation 1186 min, optional 0
   min; ask the owner with approval --plan V4-S4 before any run`. Different figures are reported with the printout (not
   re-run: the record is written once).
4. **Then S06** (its approval question is the second owner stop). No locked step runs before his answer.

## Tests

None (a data step).

## Documentation

The orchestrator's progress report: the go checks, both answers, the activation's printout.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's four checks | repository root | as step 1 | 5 min |
| step 3's `activate` | repository root | the three `wrote` lines; the two stdout lines | 2 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **STOP 1 for the owner** at step 2 (S4-6 and the authorization). A failed go check is reported before the question
  (fewer than five pilots: D-V4-20 judges the published rows only, never a missing one as a completion).
- `activate` refusing (for example `the freeze file's classes do not match the comparator cells ...`) writes nothing:
  report it; the SAs rule.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S05-B01 | Stage 4's plan exists for exactly the collection the owner authorized, with no run started | the printout; the files | `activation.json`, `plans/V4-S4.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S05-T01 | The four go checks pass and are reported | step 1 | their outputs |
| S05-T02 | The activation's groups, declared rows and comparator cells as expected (80, 1,120, 19 without S4-6) | step 3 | the printout |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the executor's reply)

The go checks; the owner's answers; the printout; the files written; the questions and rulings.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end | |
| Owner's answers (S4-6; authorization; message id) | |
| Go checks | |
| Activation printout | |
| Commit | |
| Issues and named items | |
