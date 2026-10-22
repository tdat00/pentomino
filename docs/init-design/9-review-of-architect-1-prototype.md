# Static mockup cross-check — Architect 2

**Phase 9b · 22 October 2026**

## Verdict

**Good visual and data baseline; revise the interaction affordances below before treating it as the implementation reference.** The three requested scenarios are present. No incorrect board area, piece-count policy, displayed difficulty band, or Heart geometry was found.

Reviewed all four HTML files, the shared stylesheet, and all five supplied screenshots. Static controls are intentionally nonfunctional: lack of JavaScript behavior, real import navigation, persistence, or a true Generator-to-Player payload is **not** reported as a defect.

## Checks that passed

| Scenario | Checked data | Result |
|---|---|---|
| Generator 6×10 Normal | 60 cells; K=8 within8–9; sizes5–10 within the K8 window4–12; G=4; scores12,14,13,13,15 | Normal band `[12,17)`; counts and percentages consistent |
| Generator Heart Master | Logical10×10 minus top-right5×5;75 cells; K=14 within13–15; sizes3–9; G=3; scores45,43,37 | Master band `[37,53)`; 3/14 rounds to21% |
| Player Master | 12 columns×10 rows=120 cells; K=15 within15–17; sizes4–12; initial G=3; score42 | Master band;3 locked +5 placed +1 dragged +6 tray pieces=15, with7 left |

Additional independent checks:

- Rasterized the orthogonal SVG piece outlines: both generator solution previews exactly cover their active masks without overlap; shapes are connected, free-shape-distinct under rotation/reflection, and match the tray inventory.
- Heart has precisely the requested blocked quarter and a display transform `rotate(-45 5 5)`; labels counter-rotate. Tray pieces use the same viewing angle.
- Checked the Normal thumbnails with a small exhaustive tiler: #1 has multiple solutions; #2 and #3 each have one, matching their badges. Pending badges make no premature claim.
- Player’s committed pieces occupy59 cells; the nine-cell F ghost is in bounds, non-overlapping, and matches F. Its “Fits here” indication is geometrically correct.
- No `<script>`, inline event handler, JavaScript URL, external resource URL, CSS import, or CSS resource URL was found.
- Shortcuts match the design. Hiding Patterns for K=15 is correct; Straighten need not appear in this unrotated view.

Exact search-effort scores and the hidden complete witnesses of every card were not independently reproduced; the score check establishes policy/band plausibility.

## Issues

### P9-01 — Major — Touch controls are smaller than the agreed minimum

**File:** `prototype.css`; illustrated by `screenshots/player-master-mobile.png`.  
**Problem:** `.btn`/`.icon-btn` remain32 px, `.btn-sm`28 px, and the mobile rules do not enlarge them. Undo, Reset, rotate and flip therefore depict undersized touch targets. Design §11.7 requires at least44×44 CSS px.  
**Fix:** Add coarse-pointer/mobile minimum target dimensions of44 px, including icon buttons, and reflow the header/toolbar. Refresh the mobile screenshot.

### P9-02 — Major — Player has no visible zoom controls or pan guidance

**Files:** `player-master.html`, `prototype.css`, player screenshots.  
**Problem:** The board is simply scaled by `max-width:100%`; there are no Zoom +/−/Fit affordances or instructions for panning. The signed-off brief and detail §§6.3/11.1 include zoom/pan for larger boards and touch precision.  
**Fix:** Depict nonfunctional zoom/fit controls and a concise pan affordance/instruction. Their behavior can remain unimplemented, as required for this static mockup.

### P9-03 — Minor — Running-state actions are inconsistent

**File:** `generator-heart-master.html`.  
**Problem:** The page explicitly shows New Puzzles running, but Show solution, Export set, and accepted-card Remove/Copy/Export buttons remain visually enabled. Detail §10.6 disables actions other than Cancel/navigation during a generation job. The exception for pending certificate checks is a different state.  
**Fix:** Disable the non-navigation actions in this snapshot; retain Cancel and usable Play/navigation links.

### P9-04 — Minor — Inline styles do not match the final CSP contract

**Files:** `generator-heart-master.html`, `player-master.html`; shared stylesheet.  
**Problem:** The progress bar uses `style="--p:60%"`; the selected-piece swatch uses `style="background:#911eb4"`. Pages also omit the final CSP meta. This does not violate the requested no-JS constraint, but the markup is not directly reusable under detail §12.4.  
**Fix:** Move these values to CSS classes and add the intended self-only CSP when making the mockups production-CSP representative.

### P9-05 — Minor — Difficulty is not visibly described as an estimate

**Files:** Both generator pages and `player-master.html`.  
**Problem:** Levels/scores are displayed without the estimate wording required by detail §§7.2/7.6. The existing score tooltip only states a numeric band.  
**Fix:** Add “Estimated difficulty” near the level controls/score or in a clearly available tooltip/help note; do not imply a promised human solving time.

### P9-06 — Minor — Mobile generator lacks the specified sticky action area

**Files:** `prototype.css`, both generator pages.  
**Problem:** The narrow-screen rules stack the panels but provide no sticky action bar. Generate/New Puzzles/Cancel can scroll far away, unlike detail §10.1.  
**Fix:** Add a mobile-only sticky action area for the current primary action or running-job Cancel, with content padding so it does not cover cards. Keep it static HTML/CSS.

No prototype or screenshot file was modified.
