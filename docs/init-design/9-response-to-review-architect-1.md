# Response to architect-2's prototype review, and design amendments (Phase 9c)

**Author:** architect-1 · **Date:** 2026-10-22

**Inputs:**
- `9-review-of-architect-1-prototype.md` (P9-01 … P9-06);
- my own `9-review-of-architect-2-tasks.md`, whose design gaps are fixed in `7-design-detail.md` below.

Task files were not edited.

## 1. Prototype review items

All six items are accepted. The mockups are still static HTML/CSS (no JavaScript), use CRLF and are regenerated from the validated Phase-8 data.

| ID | Sev | Decision | What changed |
|---|---|---|---|
| P9-01 | Major | **Accepted** | **Touch targets.** On screens below 900 px or with a coarse pointer, these get a minimum of 44 × 44 CSS px: buttons, icon buttons, inputs, selects, checkbox/radio rows, pack-menu rows and the menu close button. Desktop mouse controls keep 32 px.<br>**Phone layout.** The phone top bar now wraps: title on the first row, controls on the second. Phones show one puzzle card per row, so card actions keep 44 px.<br>**Accessibility.** Reset and Import gained `aria-label`s, because their text is hidden on phones.<br>**Screenshots.** `player-master-mobile.png` was refreshed. |
| P9-02 | Major | **Accepted** | **Zoom and pan.** The player board has a toolbar: **−**, the cell size ("56 px", hidden on phones), **+**, **Fit** (pressed), and "Pan: drag empty board space · two fingers on touch". The screen-reader help text mentions zoom and pan.<br>**Cell size.** Desktop cells changed from 60 px to 56 px, so the page still fits in 1440 × 900. |
| P9-03 | Minor | **Accepted** | **Running job (Heart page).** These are now disabled: Show solution, Export set, each card's Copy/Export/Remove, Export pack and Copy pack link. Cancel and navigation stay enabled.<br>**My own inconsistency, fixed.** ▶ Play all was `aria-disabled` while running, although it is navigation; it is now enabled. A hint states "Only Cancel and navigation (Play, links) work while a job runs". |
| P9-04 | Minor | **Accepted** | **No inline styles.** The progress bar uses a class (`bar-60`) plus `role="progressbar"` and `aria-valuenow`. The selected-piece swatch is an inline SVG `rect` whose `fill` is a presentation attribute, which §12.4 allows.<br>**CSP.** Every page carries the exact §12.4 CSP `<meta>`.<br>**Verified:** under this CSP, `file://` stylesheets still load in headless Edge (styles applied, no violation logged) and in headless Firefox (pixel check). Safari was not tested. |
| P9-05 | Minor | **Accepted** | **Estimate wording.** The level panel says "**Estimated difficulty:** levels come from a solver-effort score, not a promised solving time."<br>Cards read "Est. score N", with the tooltip "Estimated difficulty score; ⟨Level⟩ covers a–b". The player title reads "· est. score 42". |
| P9-06 | Minor | **Accepted** | **Sticky action bar.** Below 900 px a fixed bottom bar shows the current action. While running, it shows the progress text and **Cancel**. Once the set is ready, it shows **New Puzzles**, **Add more** and **▶ Play all**. The content has bottom padding, so the bar never covers cards.<br>**New screenshot.** `generator-heart-master-mobile.png` (390 × 844) is linked from `index.html`. |

**Validation:**
- `checkpages.mjs` was extended with these checks:
  - no inline styles, and the CSP meta present;
  - the running-state disabled set, with Cancel and Play links enabled;
  - the zoom and pan affordances;
  - the new screenshot.

  Result: **ALL PAGE CHECKS PASSED**.
- The data validator `validate.mjs` reported **ALL CHECKS PASSED** (data unchanged).
- Desktop pages measure exactly 1440 × 900 and phone pages are 390 px wide, with no horizontal overflow.
- **Incident.** Once CDP touch emulation had been enabled, `(pointer: coarse)` kept matching for later desktop shots. The fix was to take desktop shots first.

**Files changed:**
- `prototype\`: `prototype.css`, `index.html`, `generator-6x10-normal.html`, `generator-heart-master.html`, `player-master.html`;
- `prototype\screenshots\`: `generator-6x10-normal.png`, `generator-heart-master.png`, `player-master.png`, `player-master-mobile.png` and `player-master-pack-menu.png`, plus the new `generator-heart-master-mobile.png`.

## 2. Amendments to `7-design-detail.md`

| # | Gap (source) | Change | Sections |
|---|---|---|---|
| A1 | `batchSeed` and "Keep seed" undefined (T9-02) | See the rules below this table. | Header, §0 sources, §2 D41, §5.5, §6.9, §8.6, §9.4, §9.6, §10.3, §10.5, §13.2 |
| A2 | Speculation order (T9-01) | Explicit priority: the awaited attempt; then attempt 0 of later slots; then retries of the current slot; then later retries. Results are cached by (slot, attempt). Candidates use the history frozen when the request starts. Lexicographic speculation is ruled out. New §13.2 test: 10 puzzles take 3 dispatch rounds when every attempt 0 succeeds. | §6.9, §13.2 |
| A3 | BQ criterion 4 had no measurement method (T9-04) | Longest main-thread task: `PerformanceObserver('longtask')` where supported, otherwise a 10 ms `MessageChannel` heartbeat proxy. Cancel latency: one extra probe run per cell, measured at the first accepted puzzle. Certificate outcomes now include "not checked". | §8.7 |
| A4 | `.mjs` breaks browser modules on some servers (T9-03) | Every module loaded by a browser page or worker uses `.js`; `.mjs` is for Node tools only. | §12.3, §2 D42 |
| A5 | Card numbering after Add more (T9-10) | Titles are "⟨level⟩ #n", where n is the position in the visible batch; Add more continues the numbering. | §10.5 |
| A6 | Internal inconsistencies noticed during the review | §15 I5 said "Cancel < 100 ms"; it now says "< 200 ms (§8.7)". §8.4 now refers to the N-NOWORKER text instead of a variant wording. | §8.4, §15 |
| A7 | Notation (T9-22) | Board sizes written A × B mean columns × rows (W × H); rectangle orientation never matters. | §0 |

**A1 rules:**
- `batchSeed = setSeed + "#" + batchIndex`.
- `batchIndex` increments on every New Puzzles or Add more request on the current set (1 = first). It is stored with the set and continues after `generation.batchIndex` for imported sets.
- **Keep seed** reuses the seed text, so the set and every batch seed (#1, #2, …) recur. This reproduces each batch given the same history.
- With Keep seed off, Generate Piece Set first draws a new random seed. Typing a seed turns Keep seed on.

**Interpretation of the requested "Keep seed reuses the same batchSeed":** within one set, re-running a batch seed against the grown session history cannot reproduce that batch. Strict distinctness (D16) rejects its already-seen layouts. So the design reproduces batches in two ways instead:
- by recurring batch seeds in a fresh session;
- in the same session, by regenerating the set with Keep seed on. This gives a fresh set with `batchIndex` 0 and an empty history, so the next New Puzzles reuses `setSeed#1` and reproduces batch 1.

**Follow-ups for architect-2's task fixes:**

| Task | Update needed |
|---|---|
| T11 | Change the metadata example's `batchSeed` to `"K7Q2-9MXA-3FWD#1"`. |
| T15 | Use the A2 speculation priority. |
| T17, T18 | Implement D41 for the seed field, the Keep-seed flag and `batchIndex` in the generator state. |
| T21 | Make browser-loaded bench modules `.js`, and add the A3 report fields. |
