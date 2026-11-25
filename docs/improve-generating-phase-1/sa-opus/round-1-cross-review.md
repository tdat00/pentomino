# Round-1 cross-review of SA-Astra's analysis (SA-Opus)

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-1` |
| Reviewed | `docs/improve-generating-phase-1/sa-astra/round-1-analysis.md` and `evidence/sa-astra/` |
| Author's own analysis | `docs/improve-generating-phase-1/sa-opus/round-1-analysis.md` (not edited; corrections are in section 5) |
| Base | `006ca68` |
| Date | 2026-11-25 |
| New owner instruction | Discord 1574937911546085528, 2026-11-25 07:00:59 +07:00: "Tiếp tục làm các phase 2 đến khi xong, gom trong 1 PR (không merge)" ("continue with phase 2 until it is done; gather it in one PR, not merged") |

[V] marks a claim re-checked against the repository (code, git, GitHub), not against the other report. [A] marks a
judgement.

## 1. Summary

1. **We agree on the substance.** Phase 1 is implemented (T12 `fb893c3`, T13 `373e74a`) and benched (T14 `826ce79`).
   The current site and test files are the pair T14 measured, so neither a rebuild nor a new bench is needed [V].
2. **SA-Astra's re-checks hold.** Her source digest, T14 recomputation, memory figures, locale lines and T12/T13 test
   counts are right. Her nine-file closure of `measureDeduction` is right, and it is a better basis for the corpus
   clause than my three files [V].
3. **One error in her plan.** The four-width extension cannot run at width 8 through the production client: `createPool`
   rejects any size above 4 (`core/browser/worker-pool.js:75`, `:193-197`). Widths 2 and 3 are already covered
   elsewhere. Width 8 is reachable only in the fold simulation (`tests/generate.test.js:782-823`) [V].
4. **Two errors in mine.**
   - Section 3.4's sizes were loose-object sizes. Packed, `main` is 9.3 MB and the branch adds 16.8 MB, not 18 and
     47 MB [V].
   - My corpus clause named three files instead of the nine-file closure [V].
5. **The release route.** The owner's 07:00 instruction answers my Q-P1-1 and Q-P1-2: phase 1 and phase 2 go in one PR,
   which is not merged, so there is no GitHub release now. Phase 1 becomes a close-out with no merge, deploy or owner
   stop. One small ambiguity remains, which PR and when to push; I state it as Q-P1-1b with a default.

## 2. Agreements [V]

| Topic | Both analyses |
|---|---|
| Phase 1's state | built and benched in the v4 pack, unreleased; N-V4-12 closed (`tasks/improve-generating-v4/check-list.md:60-62`, `:634`, `:688-729`) |
| No rebuild, no new timing campaign | T14's numbers (Node, four workers, five seeds per cell) are adopted with their limits; not a browser qualification, not a first-puzzle service level, not a repair of phase 0's 26x26 failure |
| Source identity | the production and test files equal T14's new side `27c6189`; `main` (`b5eb858`) equals T14's old side `3fc65f4` on the site files; only P6's three files differ. `tools/record-fixtures.mjs` differs only by its LF/CRLF-normalized replay-case comparison, added on `main` by PR #13 (`git diff 3fc65f4 b5eb858` lists only that file) |
| Identity and replay | no version bump (`gen-v3`, `mixed-v3`, `difficulty-v3`, `APP_VERSION` 1.0.0); fixtures unchanged; the `gen-v3` replay case still matches; the strict reader refuses `'skipped'` (`core/engine/pack.js:813-814`); saved Generation-steps keys stay valid |
| History policy | as written in `docs/design-detail.md:1507`, including the pack-size drop; streaming adds the keys at once (`generator/jobs.js:427-444`); no new crash-durability promise (her point, accepted) |
| The app | one puzzle per press (`generator/app.js:32`), cards newest first, Play disabled while busy (`generator/ui/puzzle-panel.js:487`); none of it changes in phase 1 |
| Texts | no new or changed UI key in English or Vietnamese |
| Process | starting phase 1 is not a merge approval; the stage-4 report stays as written and the correction goes into this feature's records; verification runs through the lock with the full 45-s quiet |

## 3. Disagreements, with evidence

| # | Point | SA-Astra | SA-Opus | Evidence and proposed resolution |
|---|---|---|---|---|
| D1 | Pool invariance at 1, 2, 4 and 8 (plan §6 "Tests every phase keeps or adds") | extend the client test `runRecipe` to 1, 2, 4, 8 | widths 1-4 are already covered; 8 is reachable only in the fold simulation | `createPool` throws `RangeError('pool size must be an integer from 1 to 4')` above `MAX_POOL_SIZE` = 4 (`worker-pool.js:75`, `:195-196`); `runRecipe` uses it (`tests/generation-client.test.js:1213-1230`, `:1241`). Already covered: the real-engine fold against the serial reference at widths 1-4 in three completion orders (`tests/generate.test.js:808-823`); the client at sizes 1-4 with streamed indexes (`tests/generation-client.test.js:561-566`); the real-engine client at 1 and 4 (`:1300-1302`, `:1340-1346`) and 2 (`:1357`, `:1378`). **Resolution (Q-P1-A2):** add width 8 to the fold simulation's loop (`tests/generate.test.js:821`), a test-only change. That test took 1.8 s on `fixture-set-0` today (`p1-full-node26.log`) |
| D2 | Node 22 | not considered | a close-out gate | CI runs on Node 22 (`.github/workflows/pages.yml`: `node-version: 22`, then `node --test "tests/**/*.test.js"`). Today's Node 22.23.5 run passes 1,514 of 1,514 (`p1-verify.log`). The PR is not merged now (the owner's instruction), so CI will not run on it. **Resolution:** keep the Node 22 run in the close-out as the cheap proxy for the eventual merge |
| D3 | The corpus clause | adopt the 713-of-713 P7 reference report plus the nine-file closure | "by construction" on three files | Her closure is right (D-correction C2). The P7 report compares P7 candidates with the same reference kernel, so it adds no P6-specific observation. **Resolution:** the gate rests on the byte-equal nine-file closure and T12's lean/full and observed/unobserved tests; cite the 713-row report as context only, never as a P6 run (her own caveat) |
| D4 | The release step | a separate later owner stop | ask the route now | **Settled by the owner at 07:00:** one PR with phases 1 and 2, not merged. Neither earlier proposal applies |

## 4. Errors in SA-Astra's analysis (re-checked against the repository)

| # | Her text | What the repository shows | Effect |
|---|---|---|---|
| E1 | §3.6 and §5.5 item 2: extend the existing progressive test to widths `[1, 2, 4, 8]` using `runRecipe` | width 8 throws at `createPool` (`core/browser/worker-pool.js:193-197`); widths 2 and 3 are already tested (section 3, D1) | that step of P1-02 cannot pass as written; Q-P1-A2 replaces it |
| E2 | §3.2: `rate`, `rateDetailed` at `:423-443`; `rateLean` at `:453-456` | `rate` is at `core/engine/difficulty.js:420-423`, `rateDetailed` at `:436`, `rateLean` at `:450-453` (`completeDiagnostic` `:466` is right) | citation drift of about 3 lines; no effect on the conclusions |
| E3 | (omission) PR #11, CI and the unpushed state | PR #11 is open, `MERGEABLE`/`CLEAN`, head `826ce79`, 479 files, no checks, last updated 2026-11-20 (`gh pr view 11`). `origin/improve-generating` is `826ce79`, 70 commits behind `HEAD` (`git ls-remote origin`). CI runs only on push to `main` | needed for the PR step (section 6, Q-P1-1b) |

**Re-checked and correct:**
- the measured-source digest `a51e8196…` equals T14's new digest;
- T12's full suite was 1,512 of 1,512 (`T12-p6-diagnostic-for-returned-ratings.md`, execution log) and T13's 1,514;
- T14's response medians (1.14669, 1.20652, 1.14279, 1.32283, 0.99951, 1.02356, 1.13278), the peaks (561.949 MiB
  and 230.803 MiB) and 2,244.925 counted seconds;
- `tasks.js:194-195` (the display task uses full `rate`);
- `PERSIST_DELAY_MS = 300` (`generator/state.js:115`);
- the locale keys and lines (`generator/locale.en.js:171`, `:175`, `:218`, `:241-245`);
- `docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json` exists and records 713 equal items.

## 5. My own claims re-checked, and corrections to my analysis

| Claim (round-1 analysis) | Re-check today | Result |
|---|---|---|
| PR #11 open, head `826ce79`, mergeable, no checks | `gh pr view 11`; `git ls-remote origin` | unchanged [V] |
| Commits `fb893c3` (T12), `373e74a` (T13), `826ce79` (T14) | `git show --stat` | as stated [V] |
| The deployed-file diff against `main` is P6's three files | `git diff --stat origin/main HEAD -- core generator player assets index.html redirect.js sitemap.xml` | as stated [V] |
| "about 47 MB of research objects; `main` about 18 MB" | `git pack-objects --revs --stdout` (`p1-xr-checks.md`) | **corrected:** those were loose-object sizes. Packed with deltas, `main` is 9.3 MB, `origin/main..HEAD` adds 16.8 MB (thin pack) and the unpushed part about 13.5 MB. The "×3.6" becomes about ×2.8 |
| CI's Node version 22 | `.github/workflows/pages.yml` | as stated [V] |
| The four-width coverage | not addressed in round 1 | **added:** widths 1-4 are covered, 8 is not; see D1 and Q-P1-A2 |
| Corpus clause: `deduce.js`, `tiling.js`, `dlx.js` unchanged | the runtime import closure of `deduce.js` (`p1-xr-checks.mjs`) | **corrected:** nine files (`deduce`, `dlx`, `geometry`, `levels`, `placements`, `policy`, `qualification`, `tiling`, `workspace`), all byte-equal to `3fc65f4`. `types.js` is JSDoc only |

**Corrections to my analysis's plan after the owner's instruction:**
- **C1. No merge.** Sections 4, 5.6 and 8 (the merge, the deploy, the live version check, the GitHub release) no longer
  apply. Phase 1 ends with a pushed and updated PR, not merged.
- **C2. The developer-guide lines.** The lines for `tools/ig-proto/` (EN and VI, my section 5.4) belong to the single
  PR's documentation before it is final. They can stay in phase 1's close-out (two lines) or move to phase 2's
  documentation task.
- **C3. Release-text claims.** The speed claims (Node, four workers, five seeds; T1 as a proxy for a first press) stay
  as written; they go into the PR's phase-1 section.

## 6. The merged question list

| ID | Origin | Addressee | Status | Text and recommendation |
|---|---|---|---|---|
| Q-P1-1 | SA-Opus | owner | **answered** by the 07:00:59 instruction | the release route: phase 1 and phase 2 in one PR, not merged |
| Q-P1-1b | added (SA-Opus) | owner, optional confirmation; the default applies without an answer | **added, non-blocking** | Which PR, and when to push. **Recommended default:** the one PR is PR #11 (branch `improve-generating`, already titled for phase 1). Push after phase 1's close-out, so the PR shows phase 1 finished with the frozen round's records, then as phase 2's tasks land, with the PR text refreshed at each push. Never merge. Alternative: no push until phase 2 is done, then one push. A new PR would only duplicate PR #11 |
| Q-P1-2 | SA-Opus | owner | **answered** (withdrawn) | no GitHub release while the PR is not merged |
| Q-P1-A1 | SA-Astra | the SAs jointly (supervisor delegation) | **kept, amended** | Adopt T12-T14 with explicit bindings: the digest `a51e8196…`, `27c6189` equal to `HEAD` on site and test files, `main` equal to `3fc65f4`, T14's report hashes. The corpus clause rests on the byte-equal nine-file closure plus T12's P6 tests; the 713-item P7 report is context only. Fresh gates: the full suite on Node 26 **and Node 22**, both fixture checks, `npm run check`, the staged-site check. **Recommended:** option 1 (adopt). It absorbs Q-P1-3 |
| Q-P1-3 | SA-Opus | the SAs jointly | **merged into Q-P1-A1** (withdrawn as separate) | no new bench, no browser-page run: the site files are byte-identical to T14's measured pair, and the worker protocol and UI are unchanged |
| Q-P1-A2 | added (SA-Opus, from SA-Astra's width point) | the SAs jointly | **added** | Plan §6's pool invariance at 1, 2, 4 and 8. **(a) Recommended:** add 8 to the fold simulation's loop (`tests/generate.test.js:821`, renaming the test "pool sizes 1-4 and 8 ...") and keep the client tests at the production widths 1-4. (b) Extend `runRecipe` to 8: infeasible without a test-only pool, because `createPool` rejects sizes above 4. (c) Record width 8 as P8's (parked) and add nothing |

**No owner stop remains in phase 1.** Q-P1-1b has a default.

## 7. The phase-1 close-out, merged (for the joint report and break-tasks) [A]

| ID | Task | Executor | Gates | Cost |
|---|---|---|---|---|
| P1-01 | Adoption record (SA-Astra's proposal): the bindings of Q-P1-A1, the T14 report hashes and the nine-file closure. Also the correction of `stage4-report.md` §8 item 2 (phase 1 was already built) | SA-Astra, reviewed by SA-Opus | every hash and digest re-checked; a mismatch blocks adoption | SA 1 h; machine 0 |
| P1-02 | Q-P1-A2 (a): width 8 in the fold simulation (one test file) | Dev-Sonnet | the test passes at 1-4 and 8; `git status` shows that file only | developer 0.3 h |
| P1-03 | Close-out gates at the final base: the full suite on Node 26 and Node 22 (`npx -y node@22`), both fixture checks, `npm run check`, the staged-site check, the site-file diff against `main` (P6's three files only) | orchestrator | all pass; a failure stops with a `QUESTION:` | about 8 min wall, locked (today: 266 s of node time plus 4 × 45 s quiet) |
| P1-04 | Readiness note and the PR's phase-1 section. Optionally (C2) the two developer-guide lines (EN and VI) | SAs; Dev-Sonnet for the guides | review; `npm run check` | SA 1 h; developer 0.2 h |
| P1-05 | Push `improve-generating` and refresh PR #11's text (Q-P1-1b default), never merging | orchestrator | the PR's head equals the close-out commit; `gh pr view 11` shows it open and unmerged | 0.2 h |

Then phase 2 starts as a new analyze round in its own feature folder (the owner's instruction; D-S24-35).

**For the phase-2 hand-over:**
- P6 is in the production code that `gen-v4` builds on. P6 interacts with C3 (plan §3 P6).
- The PR's eventual merge will run CI on Node 22. The PR adds 16.8 MB packed to `main`'s 9.3 MB.

## 8. Evidence

| File | What | Command |
|---|---|---|
| `docs/improve-generating-phase-1/evidence/sa-opus/p1-xr-checks.mjs`, `p1-xr-checks.md` | the runtime import closure of `deduce.js` and its diff against `3fc65f4`; the packed sizes; the pool limit and the width tests | `node docs\improve-generating-phase-1\evidence\sa-opus\p1-xr-checks.mjs` |
| `p1-verify.log`, `p1-full-node26.log`, `p1-full-node22.log` (round 1) | the full suites on Node 26 and Node 22; the fold-simulation test's 1.8 s on `fixture-set-0` | (round 1) |

**Commands run read-only for this review:**
- `gh pr view 11 --json state,mergeable,mergeStateStatus,headRefOid,changedFiles,updatedAt,statusCheckRollup`;
- `git ls-remote origin refs/heads/improve-generating refs/heads/main`;
- `git --no-pager diff --stat 3fc65f4 HEAD -- <the nine files>`;
- `Select-String` on `core/engine/difficulty.js`, `core/engine/tasks.js`, `core/browser/worker-pool.js`,
  `tests/generate.test.js`, `tests/generation-client.test.js`, `generator/locale.en.js`, `generator/state.js`,
  `generator/ui/puzzle-panel.js` and the T12 execution log.

This review used no timed run and no locked invocation.
