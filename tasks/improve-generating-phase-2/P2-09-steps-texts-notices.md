# P2-09: Generation-steps events, texts and notices in English and Vietnamese

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.7 (new events map to steps), §4.9 (texts), §4.10; D-P2-14, D-P2-16; P2-B08 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-09` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-08 (`types.js`, `replay.js`) and P2-11b (`generator/jobs.js` and the controller test's `fakeClient`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.75 h; machine: locked focused runs |

## Goal

Users see what `gen-v4`'s search did, in English and Vietnamese, with the texts the owner approved (D-P2-16): the
locate, quick ratings that hit their limit (no score), re-ratings, a work-limit stop and a search that found no clue
count. A Nightmare set request that ends early names its side in the notice. No text claims more than the search did.

## Authority and fixed points

- The approved texts are plan §4.9's table, copied verbatim below; any other wording is a `QUESTION:` (a later
  rewording is the owner's, D-P2-16). The guide sentence row is P2-17's.
- Existing notices reused (plan §4.9): a reserve cut, a time-limit set and a response-bound set show `notice.N-NOSET`;
  a batch cut by the response bound shows `notice.N-PARTIAL`; their texts do not change.
- The two observer events, `{ stage: 'clues', kind: 'budget', source }` and
  `{ stage: 'clues', kind: 'no-window', source, side }` with `side` `'below'` or `'above'`, are emitted by P2-04's
  selector and tested there and in P2-05b. This task documents their types and maps them to steps and texts; it does
  not touch `core/engine/select-v4.js`.

## Scope

- **Change:**
  - `core/engine/types.js` (step 1), `core/engine/replay.js` (step 2), `generator/ui/replay-model.js` (step 3);
  - `generator/locale.en.js` and `generator/locale.vi.js` (step 4), `generator/jobs.js` (step 5);
  - `docs/design-detail.md` §6.12, `docs/design-brief.md` line 100.
- **Change tests**, new cases at the end of each file: `tests/replay-model.test.js`, `tests/replay-recorders.test.js`,
  `tests/generator-controller.test.js`; `tests/generator-i18n.test.js` only if it pins a key list.
- **Do not change:** anything else, `core/engine/select-v4.js` included. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/types.js', 'core/engine/replay.js', 'generator/ui/replay-model.js',
    'generator/locale.en.js', 'generator/locale.vi.js', 'generator/jobs.js', 'docs/design-detail.md', 'docs/design-brief.md',
    'tests/replay-model.test.js', 'tests/replay-recorders.test.js', 'tests/generator-i18n.test.js',
    'tests/generator-controller.test.js', 'tasks/improve-generating-phase-2/P2-09-steps-texts-notices.md')
  ```

## Steps

1. `types.js` `ClueEvent`: add `{ stage: 'clues', kind: 'budget', source: 'calibration' | 'candidate' }` and
   `{ stage: 'clues', kind: 'no-window', source: 'calibration' | 'candidate', side: 'below' | 'above' }`; the `phase`
   unions of `rated`, `unrateable` and `rejected` add `'locate' | 'window' | 'rescue' | 'rerate'`; the `unrateable`
   reason adds `'screen-capped'`.
2. `replay.js` step builder (the `switch (event.kind)` at lines 826-891): `case 'budget':`
   `make(5, 'budget', layoutOf(event), [], [], none, { source: event.source })`; `case 'no-window':`
   `make(5, 'noWindow', layoutOf(event), [], [], none, { side: event.side, source: event.source })`.
3. `replay-model.js` `stepText` (lines 284-327):
   - `rated` with `a.phase === 'locate'` -> `replay.step.locate` with `{ sequence: ordinal(a.sequence), count: step.board.clues.length, score }`;
     `rated` with `a.phase === 'rescue' || a.phase === 'rerate'` -> `replay.step.rerate` with `{ sequence, score }`;
     other `rated` steps as today;
   - `unrateable` with `a.reason === 'screen-capped'` -> `replay.step.screenCapped`; with `a.phase` `rescue` or
     `rerate` -> `replay.step.rerateCapped`; other `unrateable` steps as today;
   - `budget` -> `replay.step.budget`; `noWindow` -> `replay.step.noWindow.${a.side}`.
   Every other `step.kind` site of `replay-model.js` (lines 223-226, 364, 453, 495, 519-532, 580, 597, 620) treats
   `budget` and `noWindow` like `skip`: a clue-stage step with no rating, no highlighted clue and no score.
4. Locales: add the nine keys of the table below, English to `generator/locale.en.js` and Vietnamese to
   `generator/locale.vi.js`, each next to its family (`replay.step.*` after `replay.step.unrateable`;
   `notice.N-NOSET.below` and `.above` directly after `notice.N-NOSET`). Copy the texts character for character.
5. `jobs.js` (P2-11b changed this file first; find the places by their text, not by the base line numbers):
   - the set-failure branch with `formatNotice('N-NOSET', { level: levelLabel(levelId) })` (line 352 at the base):
     pass the variant `result.reason === 'no-window-below' ? 'below' : result.reason === 'no-window-above' ? 'above' : undefined`
     as the third argument, `formatNotice('N-NOSET', { level: levelLabel(levelId) }, variant)`;
   - `batchShortfall` (lines 132-165 at the base): `case 'response-bound':` returns the same `N-PARTIAL` notice as
     `time-limit`, by adding the case label directly above `case 'time-limit':`.
6. Tests below; the locked focused gate.

The approved texts (plan §4.9, D-P2-16), verbatim:

| Key | English | Vietnamese |
|---|---|---|
| `replay.step.locate` | Clue set {sequence} ({count} clues) is rated to find how many clues this level needs: score {score}. | Nhóm mảnh đặt sẵn {sequence} ({count} mảnh) được chấm để tìm số mảnh đặt sẵn mà mức này cần: điểm {score}. |
| `replay.step.screenCapped` | The quick rating of clue set {sequence} reached its work limit. It only guides the search; it has no score. | Lần chấm nhanh nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn phép tính. Kết quả chỉ định hướng việc tìm kiếm; không có điểm. |
| `replay.step.rerate` | Clue set {sequence} is rated again with the full limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại với giới hạn đầy đủ: điểm {score}. |
| `replay.step.rerateCapped` | The full rating of clue set {sequence} also reached its limit, so it has no score. | Lần chấm đầy đủ nhóm mảnh đặt sẵn {sequence} cũng chạm giới hạn nên không có điểm. |
| `replay.step.budget` | This clue search reached its work limit: no further rating or uniqueness check was started. | Lần tìm các mảnh đặt sẵn này đã chạm giới hạn phép tính: không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất nào. |
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went up to the largest allowed number of clues without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã tăng tới số mảnh đặt sẵn tối đa cho phép mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.noWindow.below` | The search reduced the number of clues to one without finding a clue set at this level. | Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |
| `replay.step.noWindow.above` | The search increased the number of clues to the allowed maximum without finding a clue set at this level. | Việc tìm kiếm đã tăng số mảnh đặt sẵn tới mức tối đa cho phép mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|

| `tests/replay-recorders.test.js` | `the step builder maps budget and no-window events` | the builder over a synthetic event list (`count`, `carve`, ..., `budget`, `no-window`) as the file's other builder cases do | steps `budget` and `noWindow` at stage 5 with their args |
| `tests/replay-model.test.js` | `gen-v4 steps read in English and Vietnamese` | synthetic steps: `rated` phase `locate` (5 clues, score 70, sequence 2), `rated` phase `rescue`, `unrateable` reason `screen-capped`, `unrateable` phase `rerate`, `budget`, `noWindow` below and above | `stepText` keys and placeholders as step 3; rendered English equals the table's text with values filled; Vietnamese the same |
| `tests/generator-i18n.test.js` | `both packs hold the same keys with the same placeholders` (existing) | | passes with the nine new keys |
| `tests/generator-controller.test.js` | `a no-window set failure names its side` | the file's `fakeClient` (with P2-11b's `newScope`, `clock` and `prefixSnapshot`) returning `{ status: 'failed', reason: 'no-window-above' }` for a Nightmare set; then `no-window-below` | the notice text equals `notice.N-NOSET.above` (then `.below`) filled with the level label; `time-limit` and `reserve-cut` still show `notice.N-NOSET` |
| same | `a response-bound batch shows N-PARTIAL` | a batch result `partial` / `response-bound` | the `N-PARTIAL` notice |

## Documentation

- `docs/design-detail.md` §6.12: the new step kinds (`locate` rating, screen-capped, re-rating, re-rating capped,
  budget, no-window) and that a screen-capped step shows no score.
- `docs/design-brief.md` line 100: the notice list names `N-NOSET` with its two no-window variants.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| texts check: for each of the nine keys, `Select-String -SimpleMatch -LiteralPath (Join-Path $root 'generator\locale.en.js') -Pattern '<English text>'` and the same for Vietnamese | slot root | one hit each | 1 min |
| locked focused gate: `-NodeArgs @('--test', 'tests/replay-recorders.test.js', 'tests/replay-model.test.js', 'tests/generator-i18n.test.js', 'tests/generator-controller.test.js', 'tests/replay.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if a placeholder cannot be filled from a step (for example `{count}`), or if a text would have to change
  to fit the code.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-09-B01 | P2-B08: the approved English and Vietnamese texts, verbatim | texts check; i18n parity | command and test output |
| P2-09-B02 | A screen-capped step shows no score; a no-window set names its side | replay-model and controller cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-09-T01 | The step builder maps `budget` and `no-window` to stage-5 steps with their args | replay-recorders case | test output |
| P2-09-T02 | `response-bound` batches map to `N-PARTIAL` | controller case | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Documents updated (each language)
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; the nine text checks; helper lines and pass counts; each AC row with its evidence;
questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w2, df15064f2d3d059ae6f2d61f9a9456bb1869cb34 |
| Start, end, duration | dispatched 2026-11-25 23:34 +07:00 (developer 23:34:40 to 23:39:29; doc fix to about 23:48); accepted 23:46 |
| Waiting for rulings | about 5 min (six deviations, SA-Opus) |
| Agent id, model | 7fbcd743-8e5b-45d6-a777-e67c4447fa2a, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 45; 4,797,767 / 34,016 / 4,668,378 |
| AI credits | 113.04 |
| Questions and rulings | no QUESTION; six deviations, all accepted by SA-Opus (export on stepMaker, the smallest way to test the mapping, production path unchanged; a noWindow note that is not a locale key, as step 2 prescribes; one sentence in design-brief.md's "A new puzzle is a request" paragraph; the notices bullet at the end of 6.12; the types.js edits; locale placement). Documentation fix ruled by SA-Opus: design-detail.md N-NOSET table row gains the .below and .above variants (D-P2-16 strings verbatim from the locale), and the Outcome list line reads "No set within the time limit, or four no-window ends on the same side (gen-v4): N-NOSET (its .below or .above variant for the latter)."; no pack amendment |
| Fix rounds | 1 (the ruled documentation fix) |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 12 files); rebased onto 199ed46 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked focused `IG P2-09 merge exit=0 seconds=17.761 quiet=45`, 140/140 pass, 0 fail/cancelled/todo; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | rebased 944669d; gen-v4 944669d9e49f5ea39a12d29404951f8b439c4dd0 |
| Issues and named items | N-P2-09-CELL (the score cell of a screen-capped or re-rating-capped step shows replay.table.unrateable; one new EN/VI cell string; routed to the owner's text pass); P2-17's guide sentence row; the step-builder test uses synthetic gen-v4 events only |
