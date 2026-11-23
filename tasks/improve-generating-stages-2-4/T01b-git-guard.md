# T01b: N-V4-20: the self-test's git guard sees `git -C` and calls inside expressions; `--list` for the gates

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.8 (N-V4-20), §8.2 T01; named item N-V4-20 of `tasks/improve-generating-v4/check-list.md` §6; this pack's check-list §3.1 (the case selection block) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T01a |
| Depends on | T01a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min (one case of the default group, run through the lock helper as that group requires) |

## Goal

The harness runs no git ("No git", `tools/ig-proto/README.md` §Rules), with one named exception: the two read-only
calls of `tools/ig-proto/phase1/p6-bench.ps1`. Today's guard expression misses `git -C <dir> <command>` and a call
inside an expression (`$x = @(& git ...)`), so it sees neither that exception nor a future violation of the same form.
This task widens the expression, names the one exception explicitly and keeps the sample texts out of every scanned
file, so that the guard fails on any other git call and never on its own test data. It also adds the self-test's
`--list` switch, which every later gate of this pack uses to select its cases by name (check-list §3.1).

## Authority and fixed points

- N-V4-20 (the v4 pack §6): widen the expression and name `phase1/p6-bench.ps1` as its one exception, in the next task
  that edits `self-test.mjs`, outside D-V4-20's window.
- Fixed: the exception is exactly one file; no other harness file may match, `self-test.mjs` included (it is not
  exempted); the case keeps its name `paths and fingerprint guard` and its other checks.
- The sample texts live in a JSON file, `tools/ig-proto/data/git-guard-cases.json`, which the scan does not select
  (it selects `.mjs`, `.js` and `.ps1`): a sample written into a scanned file would match the guard and fail the case
  on itself (SA-Astra's review R02).
- The new expression and the edited guard code were tried on the files the case scans at `57ef5cf`
  (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-git-guard.mjs`, 53 files with the three `calibrate.mjs`
  copies): only `tools/ig-proto/phase1/p6-bench.ps1` matches; the eleven samples give the expected values; the guard
  code of steps 2 and 3 does not match itself. The gate scans the edited source itself, not a copy.
- `--list` is the switch check-list §3.1's selection block calls; it runs no case and writes no state.

## Scope

- Create: `tools/ig-proto/data/git-guard-cases.json` (step 1).
- Change: `tools/ig-proto/self-test.mjs`: the constant `GIT_CALL` (line 58) and two new constants after it; the case
  `paths and fingerprint guard` of `cases` (lines 156-170); `main` (lines 10174-10227): the `list` switch.
- Change: `tools/ig-proto/README.md`: the "No git" bullet of `## Rules` (lines 17-18) gains one sentence; the
  `## Commands` block (line 137) gains one line.
- Do not change: every other file. Guards: G1, G2, G3 (check-list §3.2); G3 lists exactly
  `tools/ig-proto/data/git-guard-cases.json`, `tools/ig-proto/self-test.mjs` and `tools/ig-proto/README.md`.

## Steps

1. Create `tools/ig-proto/data/git-guard-cases.json` with exactly this content (CRLF line ends, final newline; each
   pair is `[text, expected]`):

   ```json
   [
     ["$head = @(& git -C $worktree rev-parse HEAD)", true],
     ["$s = $(git status --short)", true],
     ["git -C x log", true],
     ["& git diff", true],
     ["  git status", true],
     ["spawnSync('git', ['status'])", true],
     ["const x = (git status)", true],
     ["// the git status of a worktree", false],
     ["# git status in a comment", false],
     ["$head = @(& git -C \"Q:\\a b\" rev-parse HEAD)", true],
     ["& git.exe -C 'Q:\\a b' status", true]
   ]
   ```

2. In `tools/ig-proto/self-test.mjs`, replace the `GIT_CALL` line (line 58) with these lines:

   ```js
   const GIT_CALL = /(?:execFileSync|execSync|spawnSync|spawn|execFile|exec|fork)\(\s*['"`]git(?:\.exe)?\b|(?:^|[;|({&]|\$\(|@\()\s*&?\s*git(?:\.exe)?\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)\s+)?(?:rev-parse|status|log|diff|show|add|commit|push|ls-files)\b/m;
   /** The one file the guard exempts (the README's exception to "No git"): its two read-only calls must still match. */
   const GIT_EXCEPTION = 'tools/ig-proto/phase1/p6-bench.ps1';
   /** The guard's sample texts, `[text, expected]` pairs, kept in a file the scan does not select (N-V4-20). */
   const GIT_GUARD_CASES = join(IG_DIR, 'data', 'git-guard-cases.json');
   ```

3. In the case `paths and fingerprint guard`, replace the loop

   ```js
         for (const path of scanned) {
           assert(!GIT_CALL.test(readFileSync(path, 'utf8')), `${rel(path)} contains a call that starts git`);
         }
   ```

   with

   ```js
         let exempted = 0;
         for (const path of scanned) {
           const found = GIT_CALL.test(readFileSync(path, 'utf8'));
           if (rel(path) === GIT_EXCEPTION) {
             assert(found, `${GIT_EXCEPTION} no longer matches the guard: the exception would hide nothing`);
             exempted += 1;
             continue;
           }
           assert(!found, `${rel(path)} contains a call that starts git`);
         }
         assert(exempted === 1, `the guard's exception ${GIT_EXCEPTION} was scanned ${exempted} times`);
         const samples = JSON.parse(readFileSync(GIT_GUARD_CASES, 'utf8'));
         assert(Array.isArray(samples) && samples.length === 11
           && samples.every((s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'string' && typeof s[1] === 'boolean'),
         `${rel(GIT_GUARD_CASES)} must hold eleven [text, expected] pairs`);
         for (const [text, hit] of /** @type {[string, boolean][]} */ (samples)) {
           assert(GIT_CALL.test(text) === hit, `the guard on ${JSON.stringify(text)}: expected ${hit}`);
         }
   ```

   (`rel` is imported from `lib/paths.mjs` already and returns a repository-relative path with `/`; check it on this
   machine: `rel(join(IG_DIR, 'phase1', 'p6-bench.ps1'))` must equal `GIT_EXCEPTION`, else `QUESTION:`.)
4. **`--list`.** In `main` of `tools/ig-proto/self-test.mjs`: add `'list'` to the `switches` of `parseArgs` (line 10175
   at the base); move the statement `const selected = on.has('items') ? itemCases : ...;` (two lines, 10188-10189 at
   the base) up to just after `const only = ...;`; then insert right after it:

   ```js
   if (on.has('list')) {
     for (const [i, c] of selected.entries()) {
       process.stdout.write(`${i + 1} ${c.name}\n`);
     }
     return 0;
   }
   ```

   With `--list` nothing runs and no state file is written; the reserved-task check comes after it, so `--list` needs
   no `--task`. Add `[--list]` to the usage comment at the top of the file (line 5) after `[--only 1,3]`.
5. README, `## Rules`, the "No git" bullet: append "The self-test's guard (`paths and fingerprint guard`) also matches
   `git -C <dir> <command>`, a quoted `-C` path and calls inside expressions, reads its sample texts from
   `data/git-guard-cases.json` (a file it does not scan), and exempts exactly `phase1/p6-bench.ps1` (N-V4-20)."
   README, `## Commands` (line 137): after the `self-test.mjs` line, add the line
   `node tools\ig-proto\self-test.mjs [--frozen | --items | --v4] --list --label frozen   # prints "<index> <name>" per case of the group; runs nothing, writes nothing (unlocked)`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs` (default group, case 1) | `paths and fingerprint guard` | all files selected by the guard's scan (the `.mjs`, `.js` and `.ps1` files under `tools/ig-proto`, the edited `self-test.mjs` included, and the copies of `tools/calibrate.mjs` of `base`, `instr`, `log`); `tools/ig-proto/data/git-guard-cases.json` | no file matches except `tools/ig-proto/phase1/p6-bench.ps1`, which matches; the eleven sample texts give their expected values |
| the gate (unlocked) | `--list` | `node tools\ig-proto\self-test.mjs --list --label frozen --task S24-T01b-list` | first line `1 paths and fingerprint guard`; one `<index> <name>` line per default case; exit 0; no `tests\artifacts\ig-proto\frozen\S24-T01b-list\` folder |

## Documentation

`tools/ig-proto/README.md` `## Rules` and `## Commands`, as step 5 says.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T01b --label frozen` | repository root, first | `firewall: snapshot of S24-T01b` | 1 min |
| `node tools\ig-proto\self-test.mjs --list --label frozen --task S24-T01b-list; Test-Path tests\artifacts\ig-proto\frozen\S24-T01b-list` | repository root (unlocked) | first line `1 paths and fingerprint guard`; exit 0; then `False` | 1 min |
| check-list §3.1's selection block with `$Id = 'S24-T01b'`, `$GroupArgs = @()`, `$Locked = $true`, `$Required = @('paths and fingerprint guard')` | PowerShell 7 at the repository root | `PASS 1 paths and fingerprint guard`; `self-test: 1 passed, 0 failed`; `IG S24-T01b cases exit=0`; `cases: 1 passed, as required` | 5 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T01b --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T01b` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report before: changing any file other than the three of the Scope, for example when another harness file
  matches the new expression (that is a `QUESTION:`: the file would be a violation of "No git", not a case to exempt).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01b-B01 | The harness's "No git" rule is enforced on the explicitly tested native and JavaScript call forms, including `-C` and expressions, with exactly one named exception | the case | its PASS line |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01b-T01 | The new expression matches the nine call forms and none of the two comment forms of `data/git-guard-cases.json` | the case's sample loop | the PASS line |
| T01b-T02 | Only `phase1/p6-bench.ps1` matches among the scanned files (the edited `self-test.mjs` included), and it matches | the case's scan loop | the PASS line |
| T01b-T03 | `--list` prints the group's cases with their 1-based indices, runs nothing and writes no state | the unlocked `--list` gate | its output and `False` |
| T01b-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
