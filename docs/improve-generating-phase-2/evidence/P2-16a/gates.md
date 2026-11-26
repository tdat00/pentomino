# P2-18's pre-seal gates

The ordered list of gates that P2-18 runs, in the main worktree `Q:\git\pentomino`, after every development task is
accepted and merged into `gen-v4`, and before the seal is written. Written by P2-16a (review-2 R2-03); P2-16a does not
run gate 2, because some of its tooling files were not yet merged when this list was written. Every gate must pass, in
this order, before the next one starts. A failed gate is a `STOP:` for the orchestrator: nothing after it runs.

Every PowerShell block starts with this preamble (check-list §3.2) and defines every variable it reads:

```powershell
$root = 'Q:\git\pentomino'
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$ErrorActionPreference = 'Stop'
$base = '97a6326'
$utf8 = [Text.UTF8Encoding]::new($false)
```

Gates 1 to 3 are locked (check-list §3.3): the block dot-sources the helper, `-QuietSeconds 45`, no
`-IdleQuietSeconds`, no `-AllowExit1`, no retry without a ruling. The helper prints
`IG <task> exit=<e> seconds=<s> quiet=<q>` and throws on a nonzero exit.

```powershell
. (Join-Path $root 'tools\ig-proto\lock\ig-lock.ps1')
```

| # | Gate | Where | Expected output | Limit |
|---|---|---|---|---|
| 1 | The full suite | main worktree, locked | `fail 0`, `cancelled 0`, `todo 0`; `IG ... exit=0` | 600 s |
| 2 | Every phase-2 test file, one locked runner | main worktree, locked | `fail 0`, `cancelled 0`, `todo 0`; `IG ... exit=0` | 600 s |
| 3 | The four fixture checks | main worktree, locked, one run each | the lines of gate 3 | 600 s each |
| 4 | `npm run check` | main worktree | `check-conventions: OK`, `check-site: OK`, exit 0 | 2 min |
| 5 | G-PROTECTED | main worktree | `G-PROTECTED: OK` | 2 min |
| 6 | G-COPIES, `gen-v4` and `today` | main worktree | two `copies: OK (...)` lines, exit 0 | 2 min |
| 7 | The copies' builds | main worktree | one `<id> <treeId> <copyDigest>` line per variant, exit 0 | 5 min |
| 8 | The plan | main worktree | `plan: <sha256> (1013 rows)`, exit 0 | 1 min |
| 9 | The seal | main worktree | `seal: <sha256>`, exit 0 | 2 min |

## Gate 1: the full suite

```powershell
Invoke-IgNode -Repo pentomino -Task 'P2-18 full' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('--test', 'tests/**/*.test.js')
```

Expected: `fail 0`, `cancelled 0`, `todo 0` (the reporter prints `ℹ fail 0` on a terminal and `# fail 0` as TAP), within
600 s. A run that reaches the limit is an error to investigate, never a reason to raise the limit.

## Gate 2: every phase-2 test file

All ten files in one runner. A listed file that does not exist is a failure of this gate, never skipped.

```powershell
Invoke-IgNode -Repo pentomino -Task 'P2-18 phase2' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('--test', 'tools/ig-proto/phase2/trace-reader.test.mjs', 'tools/ig-proto/phase2/binding.test.mjs', 'tools/ig-proto/phase2/p2.test.mjs', 'tools/ig-proto/phase2/copies.test.mjs', 'tools/ig-proto/phase2/trace.test.mjs', 'tools/ig-proto/phase2/proofs.test.mjs', 'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs', 'tools/ig-proto/phase2/replay-probe.test.mjs', 'tools/ig-proto/phase2/glue.test.mjs', 'tools/ig-proto/phase2/browser-run.test.mjs')
```

Expected: `fail 0`, `cancelled 0`, `todo 0`, within 600 s.

## Gate 3: the fixture checks

Four runs, each in its own locked call with a 600-s limit.

```powershell
Invoke-IgNode -Repo pentomino -Task 'P2-18 fixtures' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--check')
Invoke-IgNode -Repo pentomino -Task 'P2-18 replay hard' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check', '--recipe', 'hard')
Invoke-IgNode -Repo pentomino -Task 'P2-18 replay screen' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check', '--recipe', 'screen')
Invoke-IgNode -Repo pentomino -Task 'P2-18 refusal' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--refusal')
```

Expected output, in order: `record-fixtures: OK`, `record-fixtures: replay case OK`, `record-fixtures: replay case OK`,
`record-fixtures: refusal case OK`. The line `record-fixtures: refusal case skipped (the running versions are
the file's)` is a failure here: after the cutover the old `replay-case.json` must be refused.

## Gate 4: G-CHECK

```powershell
npm run check
if ($LASTEXITCODE -ne 0) { throw 'STOP: npm run check failed' }
```

Expected: `check-conventions: OK` and `check-site: OK`, exit 0.

## Gate 5: G-PROTECTED

The block of check-list §3.4, with the preamble's `$base`:

```powershell
$Protected = @(
  'tools/ig-proto', 'docs/improve-generating', 'docs/improve-generating-stages-2-4', 'docs/improve-generating-phase-1',
  'docs/improve-generating-phase-2/request.md', 'docs/improve-generating-phase-2/plan.md',
  'docs/improve-generating-phase-2/report.md', 'docs/improve-generating-phase-2/clarifications.md',
  'docs/improve-generating-phase-2/sa-opus', 'docs/improve-generating-phase-2/sa-astra',
  'docs/improve-generating-phase-2/evidence/sa-opus', 'docs/improve-generating-phase-2/evidence/sa-astra',
  'tasks/improve-generating', 'tasks/improve-generating-v4', 'tasks/improve-generating-stages-2-4',
  'tasks/improve-generating-phase-1', 'tests/fixtures/replay-case.json', 'docs/difficulty-v3', 'docs/calibration',
  'docs/init-design', '.github', 'package.json'
)
git --no-pager diff --exit-code --stat --no-renames --diff-filter=CDMRTUXB $base -- $Protected ':(exclude)tools/ig-proto/README.md'
if ($LASTEXITCODE -ne 0) { throw 'STOP: G-PROTECTED: a protected base file changed' }
$blob = git --no-pager rev-parse "${base}:tests/fixtures/replay-case.json"
$now = git --no-pager hash-object tests/fixtures/replay-case.json
if ($LASTEXITCODE -ne 0 -or $blob -cne $now) { throw 'STOP: G-PROTECTED: tests/fixtures/replay-case.json is not byte for byte the base blob' }
'G-PROTECTED: OK'
```

Expected: `G-PROTECTED: OK`. `tools/ig-proto/README.md` is excluded because P2-17 changes it.

## Gate 6: G-COPIES

After the cutover `core\engine\version.js` holds `ALGO_ID = 'gen-v4'`, so the flag is empty: no `--rehearse-cutover`.

```powershell
node tools\ig-proto\phase2\copies.mjs check --source gen-v4
if ($LASTEXITCODE -ne 0) { throw 'STOP: G-COPIES gen-v4 failed' }
node tools\ig-proto\phase2\copies.mjs check --source today --root Q:\git\pentomino-p2-today
if ($LASTEXITCODE -ne 0) { throw 'STOP: G-COPIES today failed' }
```

Expected: `copies: OK (<n> variants, <m> edits match)` twice, exit 0. P2-16a measured on its base
`copies: OK (5 variants, 195 edits match)` and `copies: OK (1 variants, 32 edits match)`.

## Gate 7: the copies' builds

```powershell
node tools\ig-proto\phase2\copies.mjs build --source gen-v4
if ($LASTEXITCODE -ne 0) { throw 'STOP: copies build gen-v4 failed' }
node tools\ig-proto\phase2\copies.mjs build --source today --root Q:\git\pentomino-p2-today
if ($LASTEXITCODE -ne 0) { throw 'STOP: copies build today failed' }
```

Expected: exit 0, one `<id> <treeId> <copyDigest>` line per variant (five for `gen-v4`, one for `today`). The trees are
written under `tests\artifacts\ig-proto\phase2\trees\<source>\<id>\` with their `p2-copy.json` receipts (ignored by
git).

## Gate 8: the plan

```powershell
node tools\ig-proto\phase2\p2.mjs plan --out docs\improve-generating-phase-2\evidence\plan
if ($LASTEXITCODE -ne 0) { throw 'STOP: p2 plan failed' }
```

Expected: `plan: <sha256 of plan.json> (1013 rows)`, exit 0; it writes `plan.json` and `plan.md` in that folder. An
existing `plan.json` with other bytes is refused (exit 3).

## Gate 9: the seal

`<HEAD>` is the output of `git --no-pager rev-parse HEAD`; the seal refuses when the repository's `HEAD` is another
commit or its tracked worktree is not clean.

```powershell
$head = git --no-pager rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'STOP: rev-parse HEAD failed' }
node tools\ig-proto\phase2\p2.mjs seal --commit $head --today-root Q:\git\pentomino-p2-today --plan docs\improve-generating-phase-2\evidence\plan\plan.json --out docs\improve-generating-phase-2\evidence\seal
if ($LASTEXITCODE -ne 0) { throw 'STOP: p2 seal failed' }
```

Expected: `seal: <sha256 of seal.json>`, exit 0. The seal is write-once (`contracts.md` C13): an existing seal with other
bytes is refused (exit 3), and a new source epoch needs the ruling of check-list §3.5.
