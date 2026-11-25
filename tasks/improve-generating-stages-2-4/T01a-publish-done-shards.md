# T01a: N-V4-19: publish every done shard of an arm, never rewrite a publication (`arm.mjs publish --done-only`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.8 (N-V4-19), §8.2 T01; named item N-V4-19 of `tasks/improve-generating-v4/check-list.md` §6; review R01 (`review-1.md`) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `57ef5cf` |
| Depends on | none |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (synthetic, unlocked) |

## Goal

After a plan stops inside a row step (a budget stop, a kill, a collection stopped at its ceiling), today's
`arm.mjs publish` throws at the first shard that is not done, after writing only the shards that sort before it, and a
later default publish of the resumed plan rewrites every shard already published (new `meta.createdAt`, today's
producer). This task makes publication safe on stopped and resumed plans: a `--done-only` mode publishes every done
shard and names the others; both modes keep a complete existing publication byte for byte, refuse a partial one, and
refuse to label an observation with a producer other than the one that measured it.

## Authority and fixed points

- N-V4-19 (the v4 pack §6): "a publish mode that publishes every done shard of an arm and names the shards that are not
  done (their rows stay unpublished and count as missing, never invented), run for every arm of the stopped plan".
- Plan §4.8: needed "before any closure, activation reading or fit after a stopped plan"; check-list §3.4 (the closure
  stop) uses it. Records are written once (check-list §3.3).
- Review R01, adopted as the contract of this task:
  - both publish modes preserve the bytes of a complete existing publication; the default still refuses a shard whose
    state is not done, `--done-only` skips and names it; neither mode overwrites an existing published shard;
  - before a new publication, the shard's stored producer (`shard.json`'s `treeId`, `copyDigest`, `harnessHash`,
    written when the shard was created, `arm.mjs:118`, and enforced by `run` at every invocation, `arm.mjs:106`) is
    compared with the metadata about to be published (`readTreeInfo(shard.variant)`'s `treeId` and `copyDigest`,
    `harnessInfo().harnessHash`, which `buildMeta` puts in `meta.trees` and `meta.harness`); a mismatch is refused
    without writing anything: today's producer is never substituted for the observation's;
  - all the contents of a publication are computed before writing; a complete publication is its `<shard>.runs.json`,
    its `<shard>.runs.md` and the journal file the markdown names (`<shard>.calls.jsonl` or
    `<shard>.calls-summary.jsonl`) when it names one; a partial one is refused with `arm: incomplete publication
    <arm>/<shard>: a ruling is required`, never labelled `kept`; the runs JSON is written last, as the completion
    marker; recovery from a partial write is a ruling and never rewrites a complete record.
- The published files keep today's format (`arm.mjs:259-291`); `run` and `status` do not change; the compiled plans'
  `publish-<arm>` steps keep calling the default mode, which on a first publication writes the same files as today
  (only their writing order changes).

## Scope

- Change: `tools/ig-proto/arm.mjs`: the import of `./lib/records.mjs` gains `readTreeInfo`; `publishCommand` (line 245)
  becomes exported with an `io` parameter; new exported `publishPlan` and `publicationOf`; the usage comment (lines 3-8).
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: the `arm.mjs publish` line of `## Commands` and one paragraph after the
  description of `publish` (search the README for `arm.mjs publish`).
- Guards: G1, G2; G3 lists only `tools/ig-proto/arm.mjs`, `tools/ig-proto/self-test.mjs`, `tools/ig-proto/README.md`
  (the integration case's fixtures live under `tests/artifacts/ig-proto/selftest/`, git-ignored, and are removed by
  the case).

## Steps

1. In `tools/ig-proto/arm.mjs`, add after `const sec = ...` (line 241):

   ```js
   /**
    * The state of a shard's publication in `outDir` (N-V4-19, review R01): `none` when none of its files exists;
    * `complete` when its runs JSON and runs markdown exist and the journal file the markdown names (if any) exists;
    * otherwise `incomplete`.
    * @param {string} outDir
    * @param {string} name
    * @returns {'none' | 'complete' | 'incomplete'}
    */
   export function publicationOf(outDir, name) {
     const files = ['runs.json', 'runs.md', 'calls.jsonl', 'calls-summary.jsonl'].map((s) => join(outDir, `${name}.${s}`));
     if (!files.some((f) => existsSync(f))) {
       return 'none';
     }
     if (!existsSync(files[0]) || !existsSync(files[1])) {
       return 'incomplete';
     }
     const named = /The journal lines are in `([^`]+)`/.exec(readFileSync(files[1], 'utf8'));
     return named === null || existsSync(join(outDir, named[1])) ? 'complete' : 'incomplete';
   }

   /**
    * The plan of a publication (N-V4-19, review R01): a partial publication refuses the command first, in both modes,
    * before any other shard is judged (the first in name order is named); otherwise complete publications are kept,
    * done shards without one are published, and the other shards are named (`--done-only`) or refuse the command (the
    * default). Pure.
    * @param {{ name: string, done: boolean, publication: 'none' | 'complete' | 'incomplete', recorded: number | null,
    *   expected: number | null }[]} shards In name order.
    * @param {{ arm: string, doneOnly: boolean }} o
    * @returns {{ refuse: string | null, publish: string[], kept: string[],
    *   notDone: { shard: string, recorded: number | null, expected: number | null }[] }}
    */
   export function publishPlan(shards, { arm, doneOnly }) {
     const partial = shards.find((s) => s.publication === 'incomplete');
     if (partial !== undefined) {
       return { refuse: `incomplete publication ${arm}/${partial.name}: a ruling is required`, publish: [], kept: [], notDone: [] };
     }
     /** @type {string[]} */
     const publish = [];
     /** @type {string[]} */
     const kept = [];
     /** @type {{ shard: string, recorded: number | null, expected: number | null }[]} */
     const notDone = [];
     for (const s of shards) {
       if (s.publication === 'complete') {
         kept.push(s.name);
       } else if (s.done) {
         publish.push(s.name);
       } else if (doneOnly) {
         notDone.push({ shard: s.name, recorded: s.recorded, expected: s.expected });
       } else {
         return { refuse: `shard ${s.name} of arm ${arm} is not done: nothing published`, publish: [], kept: [], notDone: [] };
       }
     }
     return { refuse: null, publish, kept, notDone };
   }
   ```

   The partial publication is checked before the loop (ruling R-P24-01 of 2026-11-23 on T01a's QUESTION 1, check-list
   §5.4): it needs a ruling whatever the mode, so it is never hidden behind the default mode's not-done refusal of a
   shard that sorts before it.

2. Replace `publishCommand` by `export async function publishCommand(argv, io = {})` with this behaviour (the published
   contents are today's, `arm.mjs:259-291`):
   - `const { args, on } = parseArgs(argv, { values: ['task', 'arm', 'label', 'source-label'], switches:
     ['done-only'] });` `armDir = io.armDir ?? artifactDir(args.label, args.task, args.arm)`; `outDir = io.outDir ??
     evidenceDir(args.label, args.task, args.arm)`; `producerOf = io.producerOf ?? ((variant) => { const info =
     readTreeInfo(variant); return { treeId: info.treeId, copyDigest: info.copyDigest, harnessHash:
     harnessInfo().harnessHash }; })`; `metaOf = io.metaOf ?? ((variant) => buildMeta({ task: args.task, label:
     args.label, kind: 'runs', trees: [variant], sourceLabel: args['source-label'] }))`; `say = io.say ?? ((line) =>
     process.stdout.write(\`${line}\n\`))`.
   - The two refusals before the loop stay (`no arm <arm> of <task>`, `arm <arm> of <task> has no shard`).
   - Classify every shard folder in name order: `state` (`state.json` parsed, or null), `done = state?.done === true`,
     `publication = publicationOf(outDir, name)`, `expected` (`shard.json`'s `rows.length`, else `state?.expected ??
     null`), `recorded` (`state?.recorded`, else the number of `t: 'recorded'` lines of `rows.jsonl` when it exists,
     else null). `const plan = publishPlan(list, { arm: args.arm, doneOnly: on.has('done-only') })`; a non-null
     `plan.refuse` throws `new Stop(plan.refuse)` before anything is written.
   - For every name of `plan.publish`, before any write: read `shard.json`; `const now = producerOf(shard.variant)`; if
     `shard.treeId !== now.treeId || shard.copyDigest !== now.copyDigest || shard.harnessHash !== now.harnessHash`, throw
     `new Stop(\`producer changed ${args.arm}/${name}: observed tree ${shard.treeId}, copy ${shard.copyDigest}, harness
     ${shard.harnessHash}; today ${now.treeId}, ${now.copyDigest}, ${now.harnessHash}: a ruling is required\`)` (all
     shards are checked first, so a refusal writes nothing).
   - Then, for each name of `plan.publish` in order (a local `async function publishShard(name)` declaring `const dir =
     join(armDir, name)`): build `meta = await metaOf(shard.variant)`, `rows`, the journal lines (`collectCalls`), the
     markdown lines and the journal file name exactly as today, all before writing; write the markdown (`writeText`),
     then the journal file (`writeJsonl`, when there are lines), then the runs JSON (`writeJson`) last; `say(\`arm:
     published ${args.arm}/${name}: ${rows.length} rows, ${calls.length} journal lines\`)`.
   - Then `say(\`arm: kept ${args.arm}/${name}: already published\`)` for each of `plan.kept`; with `--done-only`,
     `say(\`arm: not published ${args.arm}/${entry.shard}: not done (${entry.recorded ?? '?'} of ${entry.expected ?? '?'}
     rows recorded; its rows count as missing)\`)` for each of `plan.notDone`; finally `say(\`arm:${on.has('done-only') ?
     ' done-only:' : ''} published ${plan.publish.length}, kept ${plan.kept.length}, not done ${plan.notDone.length} of
     ${list.length} shards of ${args.arm}\`)` and return 0.
3. `main` keeps calling `publishCommand(rest)` (no `io`). Update the usage comment: `node tools\ig-proto\arm.mjs publish
   --task <T> --arm <A> --label <L> --source-label <SL> [--done-only]` and the line `--done-only (N-V4-19): publishes
   every done shard not yet published and names the others; both modes keep a complete publication, refuse a partial one
   and refuse a shard whose producer is not today's.`

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `publish: the plan of a publication (N-V4-19)` | `publishPlan` of `[{ name: 'pilot-a', done: true, publication: 'none', recorded: 5, expected: 5 }, { name: 'pilot-b', done: false, publication: 'none', recorded: 2, expected: 5 }, { name: 'pilot-c', done: true, publication: 'complete', recorded: 5, expected: 5 }]` with `{ arm: 'fr', doneOnly: true }`, then `doneOnly: false`; then with `pilot-c`'s publication `incomplete` (both modes) | `{ refuse: null, publish: ['pilot-a'], kept: ['pilot-c'], notDone: [{ shard: 'pilot-b', recorded: 2, expected: 5 }] }`; `refuse` `shard pilot-b of arm fr is not done: nothing published`; `refuse` `incomplete publication fr/pilot-c: a ruling is required` in both modes (the partial publication is judged before any other shard, so in the default mode it wins over `pilot-b`'s not-done refusal; ruling R-P24-01) |
| same | `publish: stopped shards, resume and immutable outputs` | in a fresh folder `tests/artifacts/ig-proto/selftest/S24-T01a-dev/` (helper `fresh`): an arm folder with shards `pilot-a` (done), `pilot-b` (not done: `state.json` `{ done: false, recorded: 0, expected: 1 }`), `pilot-c` (done) and an out folder holding a pre-written complete publication of `pilot-c` (runs JSON, runs markdown ending `This tree writes no journal.`); every `shard.json` `{ variant: 'base', treeId: 't', copyDigest: 'c', harnessHash: 'h', rows: [{ key: 'x~0', caseId: 'x', rep: 0, seed: 'landscape/x/0' }] }`, every done shard's `rows/x~0/report.json` `{ runs: [await matrixRun('x', 0)] }`; `io` `{ armDir, outDir, producerOf: () => ({ treeId: 't', copyDigest: 'c', harnessHash: 'h' }), metaOf: async () => ({ format: 'ig-proto-runs', version: 1, label: 'frozen', source: { label: 'selftest', sourceDigest: '0'.repeat(64), equalsMp12b1Source: false }, rerun: 'selftest' }), say }`. Run `publishCommand([... '--done-only'], io)`; then make `pilot-b` done (its `state.json` and report) and run the default `publishCommand`; then add `pilot-d` (done) with only `pilot-d.runs.json` in the out folder and run the default; then remove `pilot-d`'s files, add `pilot-e` (done, `shard.json` `treeId` `'other'`) and run the default | first run: returns 0, `pilot-a`'s two files written (runs JSON, runs markdown; no journal), `pilot-c`'s bytes unchanged, the lines `arm: kept fr/pilot-c: already published`, `arm: not published fr/pilot-b: not done (0 of 1 rows recorded; its rows count as missing)` and `arm: done-only: published 1, kept 1, not done 1 of 3 shards of fr`; second run: returns 0, `pilot-b` published, `pilot-a` and `pilot-c` byte-identical to before; third run: throws `incomplete publication fr/pilot-d: a ruling is required`, no file created; fourth run: throws a message starting `producer changed fr/pilot-e: observed tree other`, no `pilot-e` file created; the case removes its folder at the end |

## Documentation

`tools/ig-proto/README.md`: in `## Commands`, the `arm.mjs publish` line gains `[--done-only]`; after the paragraph that
describes `publish`, add: "**Publication is written once** (N-V4-19, stages 2 to 4 pack T01a): both modes keep a
complete publication (`arm: kept <arm>/<shard>: already published`), refuse a partial one (`arm: incomplete publication
<arm>/<shard>: a ruling is required`) and refuse a shard whose stored producer differs from today's tree or harness
(`arm: producer changed ...`), before writing anything; the runs JSON is written last. **`--done-only`** publishes every
done shard and names every shard that is not done (`arm: not published <arm>/<shard>: not done (<r> of <e> rows
recorded; its rows count as missing)`); it is run for every arm of a stopped plan before a closure, an activation
reading or a fit. The default mode still refuses a shard that is not done."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T01a --label frozen` | repository root, first | `firewall: snapshot of S24-T01a` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T01a --horizon-s 285` | repository root (unlocked) | every case `PASS`, the two new ones included | 5 min |
| `node tools\ig-proto\arm.mjs publish --task V4-S2 --arm fr-none --done-only --label frozen --source-label "frozen 3fc65f4"` | repository root (unlocked; every shard is complete, so nothing is written) | eight lines `arm: kept fr-none/pilot-<cell>: already published` and `arm: done-only: published 0, kept 8, not done 0 of 8 shards of fr-none`; `git status --short docs/improve-generating/evidence/frozen/V4-S2` prints nothing | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T01a --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T01a` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 (check-list §3.2) | repository root | G1, G2 print nothing; G3 lists the three files of the Scope | 1 min |

## Stop points and questions

- Stop and report before: any run of `publish` on a task folder other than the read-only check on `V4-S2` above (the
  integration case uses its own fixture folder).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01a-B01 | After a stopped plan, every measured row of a done shard can be published; no publication is rewritten, invented or relabelled with another producer | the integration case; the read-only check on V4-S2 | the PASS line; the command output |
| T01a-B02 | A first publication by a compiled plan's `publish-<arm>` step writes today's files | the integration case (a first default publication); the code of step 2 | the PASS line; the diff of `arm.mjs` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01a-T01 | `publishPlan` gives the Tests table's plans and refusals | `--items` | the PASS line |
| T01a-T02 | Kept publications are byte-identical after both modes; a partial publication and a changed producer are refused with nothing written | the integration case | the PASS line |
| T01a-T03 | `--done-only` on `V4-S2/fr-none` writes nothing and keeps its eight shards | the command and `git status` | the output |
| T01a-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-23 23:16 +07:00 (dispatch, base `2ba6170`); 2026-11-23 23:28 +07:00 (accepted); 12 min. The developer reported 23:16:34-23:19:13 and, after the ruling, 23:24:11-23:25:02 |
| Waiting for rulings | about 5 min (QUESTION 1 at 23:19, ruling relayed about 23:24) |
| Agent id, model | `3993e5d4-0af8-4e4a-aae1-b326f74d34e1`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 30 calls; 2,304,284 input, 22,825 output, 2,202,191 cache-read tokens |
| AI credits | 70.37 (developer only) |
| Questions and rulings | QUESTION 1 (`publishPlan` judged shards in name order, so a not-done shard hid a partial publication in the default mode): ruling R-P24-01 by SA-Opus, Option A (the partial publication is checked before the loop); pack amendment `d20e07c` (T01a Step 1, its Tests row, check-list §5.4) |
| Fix rounds | 0 (the ruling round only) |
| Gates re-run by the orchestrator | `self-test --items --task S24-T01a-orch`: 207 passed, 0 failed (31.9 s; cases 206 and 207 PASS); `arm.mjs publish --task V4-S2 --arm fr-none --done-only`: 8 kept, `published 0, kept 8, not done 0 of 8`, `git status --short` of the V4-S2 evidence empty; `firewall check --task S24-T01a`: OK, 289 files; `npm run check`: OK; G1, G2 empty; G3 the three Scope files |
| Commit | this task's commit (`improve-generating-stages-2-4 T01a: ...`) |
| Issues and named items | none |
