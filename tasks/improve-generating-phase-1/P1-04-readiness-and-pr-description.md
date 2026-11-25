# P1-04: Readiness note and detailed PR description

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-1`; plan §4.7, P1-B02/B03/B04, D-P1-03/D-P1-05-D-P1-08, N-P1-DOC |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `eca0f94717a56de43c52f6cb54d739360670fef8` |
| Depends on | P1-03b accepted and committed |
| Pack author / reviewer | SA-Astra / SA-Opus |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) for mechanical drafting; both SAs approve the reading |
| Estimate | developer 1 h; machine 0 measured min, data/document checks only |

## Goal

Give PR #11 the detailed account the owner asked for, with observed verification results rather than copied
old pass claims. State what is finished, what remains separate and what must be fixed before any future merge.
The output is reviewed here and published only by P1-05.

## Authority and fixed points

- D-P1-07: phase 1 is PR #11; phase 2 is `gen-v4` from the published close-out, a different PR into `main`;
  neither PR is merged. No phase-2 implementation on `improve-generating`.
- Actual verification is P1-03b's sealed index. T14 timings remain historical, five-seed Node screening.
- Read the final plan/report, `E/adoption.json/.md`, `E/verification/index.json/summary.md`,
  `docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md`,
  and the existing developer guides only to confirm the stated omission.
- No English/Vietnamese app string changes. The PR and technical readiness note are English, as the existing PR.

## Scope

- Create `docs/improve-generating-phase-1/readiness.md`.
- Create `docs/improve-generating-phase-1/pr-body.md`.
- Do not edit the plan/report, code, tests, guide files, historical evidence, readers or any PR.
- G-PROTECTED empty; G-QUALIFIED passes; G-WORKTREE only these two files/bookkeeping.

## Steps

1. Run G-PROTECTED and G-QUALIFIED (check-list §3.3). Check phase 0's recorded line is exactly
   `Phase 0: FAIL (control 26x26-nightmare: fail)`
   (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md:316`).
   A different line, missing gate or stale binding is a QUESTION; do not make a new verdict.
   For G-WORKTREE, set:

   ```powershell
   $Allowed = @(
     'docs/improve-generating-phase-1/readiness.md',
     'docs/improve-generating-phase-1/pr-body.md',
     'tasks/improve-generating-phase-1/P1-04-readiness-and-pr-description.md',
     'tasks/improve-generating-phase-1/check-list.md'
   )
   ```
2. Resolve values from data, not from earlier prose:

   | Token used below | Source/rule |
   |---|---|
   | `QUALIFIED` | `verification/index.json` `qualifiedCommit`, full SHA |
   | `DIGEST` | Index `runtimeDigest`, equal to `adoption.json` `source.currentDigest` |
   | `NODE26`, `NODE22` | Index `node.node26` and `node.node22`, printed unchanged |
   | `FULL26`, `FULL22` | `P1-03b full-node26` and `full-node22` rows of `summary.md`, and index `gates[].seconds` |
   | `FOCUSED` | Index `focused`: task, actual `node`, seconds, two log paths/hashes; two cases, 30 simulation comparisons |
   | `COST` | Index `nodePlusQuietSeconds / 60`, to two decimals; label node+quiet, not wall time |
   | `CELL_ROWS` | `adoption.json` `bench.cells`, T14 order: `cell`, `oldTen/newTen` of 5, `equal/pairs`, `response.median.toFixed(5)` |
   | `MEMORY` | `adoption.json` `bench.memory`: `processPeak`, `processLimit`, `accountedPeak`, `accountedLimit` divided by 1,048,576 to three decimals; `sideCells` 14 and `bothChecksPass` true |

   Every linked evidence path must exist. Include full commit permalinks where a commit is named:
   `https://github.com/tdat00/pentomino/commit/<full SHA>`. Repo-relative paths remain readable even before
   this branch is pushed. Do not invent a phase-2 PR number or fork SHA; P1-05 adds the publication footer.
3. **`readiness.md`** uses these headings and statements:

   - Title `# Phase-1 readiness`.
   - Initially `Status: Ready for joint SA approval`; after approval the orchestrator changes it to
     `Status: Ready for publication (phase 1 only; not merged)`.
   - `## Scope and source`: plan commit `eca0f94`; `QUALIFIED`; `DIGEST`; the three source bridges
     from `adoption.json` `bridges` (two empty bridges, main-to-inspected the three P6 files);
     P6 and the original history implementation already existed, this close-out adds the simulation/record checks.
   - `## Verification`: a table for focused, full Node 26, full Node 22, generation fixture, replay fixture,
     conventions, static site, adoption and source guards. Each row gives actual outcome, version/count where
     relevant, and the evidence path/hash from the index. No “all green” without the rows.
   - `## Historical measurement adopted`: `CELL_ROWS`, `MEMORY`, 35 equal observed pairs; original T14 commits,
     its 2,244.925 seconds of a separate 2,700-second grant. Preserve 10x10's 4/5 ten count and equal 9/9 pair.
   - `## Limits and known item`: exact statements from step 4 below; N-P1-DOC is still open before any merge.
   - `## Publication and phase-2 hand-over`: PR #11 `improve-generating` -> `main`, not merged. Phase 2 starts
     after this close-out on `gen-v4` from P1-05's published head, PR base `main`; the phase-1 prefix is inherited
     while PR #11 is unmerged. P1-05 records the exact fork. No phase-2 qualification is implied.
   - `## Sign-off`: lines `SA-Astra:` and `SA-Opus:` left unfilled by the developer.

4. **`pr-body.md`** must use the following literal section structure/content, filling only the data fields in
   step 2. Expand the verification table with the actual values/links; do not leave tokens in the output.

   ```markdown
   ## Phase 1: complete, not merged

   This PR contains phase 1: P6's same-puzzle rating improvement, the progressive-presentation/history checks,
   and their close-out evidence. Do not merge. No release, tag or deployment is requested.

   Phase 2 (`gen-v4`) will continue on branch `gen-v4` from this branch's published phase-1 close-out, in a
   separate PR into `main`. No phase-2 implementation is part of this phase-1 close-out.

   ## Details of the changes

   ### Engine
   - `core/engine/difficulty.js`: the shared DLX diagnostic, `rateLean` and `completeDiagnostic`.
   - `core/engine/clues.js`: lean profiles only without a seam, recorder or `onRate`; successful returned ratings
     are completed. Observed/replay ratings retain the full diagnostic.
   - `core/engine/types.js`: the internal-only `dlxStop: 'skipped'` type; valid stored ratings never contain it.

   Scores, work units, selection, uniqueness, fixtures and stored puzzle identities are unchanged.
   The algorithm remains `gen-v3`, the policy `mixed-v3`, the model `difficulty-v3`, the RNG `xoshiro128ss-v1`
   and the app version `1.0.0`.

   ### Tests
   - `tests/difficulty.test.js`: lean/full completion, field/key order, immutability and stored-claim refusal.
   - `tests/clues.test.js`: returned canonical rating and observed/unobserved/recorded selection equality.
   - `tests/generation-client.test.js`: accepted puzzles stream in slot order, identical at one and four workers.
   - `tests/generator-controller.test.js`: shown-puzzle history after short, cancelled, failed and size-trimmed batches.
   - `tests/generate.test.js`: the close-out adds logical width 8 to the existing simulation at widths 1, 2, 3,
     4 and 8, two real seed cases and three completion orders: 30 comparisons against the serial fold.

   Width 8 is test-only simulation. The production pool remains limited to four workers.

   ### Living specification
   `docs/design-detail.md`: shared types and engine APIs (§§4.1-4.2), history and P6 (§§6.9-6.10), lean clue-search
   ratings in the metrics section (§7.1), rating (§7.10), capacity-trim history (§10.5), and the generate test-table
   sentence (§13.2).

   The UI stays one puzzle per press, newest-first cards, Play disabled while busy, with no EN/VI text change.
   A shown puzzle stays in its set's seen-history after every terminal outcome or later card/capacity removal,
   until an explicit history reset. Existing save/flush/failure semantics remain; no new crash-durability promise.

   ## Close-out verification
   ```

   Insert `QUALIFIED`, `DIGEST`, the complete actual verification table (same rows as readiness), `COST`, and links
   to `adoption.json`, `verification/index.json`, `verification/summary.md`, `readiness.md`.
   Then these sections:

   ```markdown
   Node 22 verification ran on Windows, not Ubuntu CI. The static-site check is not a browser run or deployment.
   This repository's Pages workflow does not run on PR updates; empty PR checks are not a green CI result.

   ## Historical timing and memory
   ```

   Insert `CELL_ROWS`, original T14 old/new commits, `MEMORY`, and the 35 equal-pair statement. Continue literally:

   ```markdown
   These are five-seed Node results at four workers, cold, with a fresh process per request. T14's T1 ends at
   set validation/calibration, not at a user's first playable card. T10 is conditional on reaching ten.
   The results are descriptive: not browser qualification, a first-puzzle service level or a universal
   non-regression guarantee. The production digests cover ordered layout/clue keys and scores; the P6/fixture
   tests cover full returned-rating compatibility. No new timing campaign was run for this close-out.

   ## Research records, not deployed application code

   This branch also carries `tools/ig-proto/`, `tasks/improve-generating-v4/`,
   `tasks/improve-generating-stages-2-4/`, and the improve-generating analysis/evidence records. The apps do not
   load the research harness and the Pages artifact does not include it.

   The frozen round is complete. Its result remains:
   `Phase 0: FAIL (control 26x26-nightmare: fail)`.
   D-S24-35 scopes the later phase-2 proposal: today's search on 26x26 Nightmare, with `gen-v4` proposed for the
   other boards and its own required production, replay and `require` validation. Phase 1 does not reclassify
   the failure or qualify phase 2's changed runtime.

   ## Known before any merge

   The developer guides (EN and VI) do not yet name `tools/ig-proto/`, which this branch adds; a later
   documentation task adds the line before any merge (`AGENTS.md`). This is N-P1-DOC and is not silently
   fixed by documentation on another branch.

   Neither this PR nor the later phase-2 PR is merged under the current instruction. The phase-2 PR targets
   `main` and initially includes the unmerged phase-1 prefix; it must disclose that dependency and show its
   phase-2-only range from the recorded fork point.
   ```

5. Link the literal engine/test/spec changes to their paths and T12/T13/P1-02 evidence. Keep the four T14
   publication identities intact; do not relabel them as newly measured at QUALIFIED.
6. Run G-QUALIFIED, G-PROTECTED, G-WORKTREE, G-FORMAT with
   `$FormatFiles = @($Allowed[0..1] | ForEach-Object { $_.Replace('/', '\') })`,
   and `npm run check` (check exit 0). Report `READY FOR SA REVIEW: P1-04`.
   The orchestrator obtains both SAs' acceptance of the numbers/wording, records their dated sign-offs and
   changes readiness's status as above. The developer never invents or infers approval.
   After those document edits, re-run only these checks; no suite. The orchestrator also runs G-FORMAT
   on the task/check-list bookkeeping before its single task commit.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| G-QUALIFIED | existing sealed qualification | current HEAD plus new documents only | no throw; tested files and sealed evidence unchanged |
| two new Markdown files | detailed description completeness | literal file/section lists, actual gate table and limits | all plan §4.7 items present; no tokens or invented results |
| readiness sign-off | joint reading | the two SAs' explicit approvals | both dated approvals, correct status |

## Documentation

These are the two deliverables. Do not change EN/VI developer guides now; disclose N-P1-DOC exactly.
Do not edit the old stage-4 report or earlier independent analyses.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| G-QUALIFIED (check-list §3.3) | root, unlocked | no throw | 1 min |
| G-FORMAT on `readiness.md` and `pr-body.md` | root | `format: OK (2 files)` | 30 s |
| `npm run check` | root | both checks OK | 2 min |
| G-PROTECTED / G-WORKTREE | root | no protected change; two Create files only | 1 min |
| Both SAs' review | documents/records | accept, dated sign-offs | before task acceptance |

## Stop points and questions

- Stop before publication; only P1-05 edits the PR or pushes.
- Stop for both SAs' readiness review. A failed gate is not text to explain away.
- `QUESTION:` to the pack author through the orchestrator when the task is wrong, behaviour is ambiguous, a gate
  fails for an uncovered reason, an outside-scope change is needed or a recorded decision would change.

## Acceptance criteria

### Business

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-04-B01 | The owner gets literal change details and actual qualification, with honest limits | both SAs compare documents to sealed data | readiness/PR body and sign-offs |
| P1-04-B02 | Both PRs remain unmerged; the guide omission and phase-2 dependency are visible | exact required sections | PR body |

### Technical

| ID | Criterion | How verified | Evidence |
|---|---|---|---|
| P1-04-T01 | No placeholders/stale results; qualified code and evidence links exact | G-QUALIFIED and document review | indexed sources |
| P1-04-T02 | Only documents changed, source/test binding intact | G-QUALIFIED and guards | outputs |
| P1-04-T03 | Formats pass and both approvals recorded | G-FORMAT, npm check and sign-offs | readiness and gate output |

## Checklist

- [ ] Two documents complete, every literal plan §4.7 item present
- [ ] Every value comes from sealed evidence; no placeholder or future result
- [ ] Both SAs accepted and readiness status/signatures are recorded by the orchestrator
- [ ] N-P1-DOC and the two-PR/no-merge/fork route explicit
- [ ] Formats/guards and every AC evidence complete
- [ ] No task-pack edit, commit, push or PR mutation by the developer

## Final report

Start/end/duration; files; verification/qualified commit and data sources; every AC's evidence; joint reading
result; questions/rulings/deviations. State that publication remains P1-05. Do not commit or push.

## Execution log

| Item | Value |
|---|---|
| Start, end, duration | dispatched 11:42 +07:00 (developer 11:38:49 to 11:43:06; fix round to about 12:01); both SA sign-offs about 12:06; accepted 12:08; about 26 min |
| Waiting for rulings | about 8 min (SA-Astra's merged ruling of the two reviews) |
| Agent id, model | d4962aa0-bcc8-4234-86d0-8e46dc11bfdf, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 34; 3,063,621 / 40,940 / 2,809,000 |
| AI credits | 132.68 |
| Questions and rulings | no QUESTION; seven deviations: 1, 2, 4, 5, 6, 7 accepted; 3 (raw-hash tables) ruled by SA-Astra's merged list superseding her A1/A2 and SA-Opus's F1-F4: hashes kept in readiness.md with a corrected caption, removed from pr-body.md; two pr-body rows shortened; T14 table re-captioned with the ratio direction; SA-Opus's review files committed separately (f50411e) |
| Fix rounds | 1 |
| Gates re-run by the orchestrator | phase-0 line 316 exact; G-PROTECTED, G-QUALIFIED, G-WORKTREE, G-FORMAT and `npm run check` OK; readiness.md Status `Ready for publication (phase 1 only; not merged)` with both SA sign-offs |
| Commit | this task's commit |
| Issues and named items | N-P1-DOC stays open (developer guides do not yet name tools/ig-proto/), stated in both files |
