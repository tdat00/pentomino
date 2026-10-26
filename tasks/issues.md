# Issues

Browser checks that were switched off after the removal of `#pack=` / `#lib=` (the harness opens its source Player
through a `#p=` list address, so the source puzzle travels through the puzzle-code worker). They were listed in
`DISABLED` at the top of `check()` in `tests/browser/puzzle-code-acceptance.js`; all are fixed, and `DISABLED` is gone
(`?only=` still runs a single check).

| Check (name starts with) | What happened | Status |
|---|---|---|
| `BA05 BA01:` (243-character oracle) | The expected link length 288 had been recorded on the public Player address; the page's own Player is longer. | **Fixed.** The check computes the expected length from `${OWN}#p=` and the code. |
| `BA06 BA07 BA08 BA09:` (custom pack) | The fixture's two puzzles had the same clues, so the `#p=` list was refused ("Puzzle 2 repeats puzzle 1"), as intended. | **Fixed.** The fixture's second puzzle has one more clue. |
| `BA15:` (a delayed answer for puzzle A cannot print, copy or open anything) | Since the Print dialog keeps the puzzles chosen when it opened, changing the app's selection no longer prepares again, so the check waited for puzzle B forever. The frame stall that was suspected could not be reproduced (BA15 then BA23, at 0a0d04a and now). | **Fixed.** B is chosen in the dialog's own list; the copy part uses the Share dialog. |
| `BA23:` (refused clipboard shows the exact link) | Written for the removed Copy-link dialog. Rewriting it for the Share dialog showed that opening the dialog tried to focus **Copy link** while it was still disabled. | **Fixed.** Check rewritten; `share-dialog.js` focuses Copy link once the link is ready. |
| `BA26:` (untitled later puzzle keeps "Puzzle #n" / "Đề #n") | A code carries the heading that was current when it was made (documented), so an English-made link stays "Puzzle #3" in Vietnamese. | **Fixed (check changed).** The link is made in each language, and the English-made link is asserted to keep "Puzzle #3". |
| `BA29:` (without module workers the Player says so) | The source Player had already started its code worker to open the `#p=` address before the check removed `Worker`. | **Fixed.** The game opens from the sample, which needs no worker; Share then says the link could not be prepared. |
| `matrix en|vi light|dark|high-contrast:` (six checks) | The entry dialog returns the focus in its `close` event, after `open` is false; the check asserted at once. Not related to frames. | **Fixed.** The check waits for the focus to reach the puzzle title. |

Also:

- The frozen QR matrices (`tests/fixtures/puzzlecode-v1.json`, `qrMatrices`) are those of the public Player address, so
  on a local origin they are pinned by the Node test (`tests/puzzlecode-acceptance.test.js`) alone. **Unchanged by
  design.** The CDP runner now decodes every QR raster of the page with jsQR (9 of 9 match the shared link).
- Trusted-input and phone checks (`?phase=narrow`, `?phase=keys`) were not run after the `#pack=` / `#lib=` removal.
  **Done.** Both phases run and pass; narrow found the Share dialog's ✕ at 32 px with a coarse pointer (now 44 px).
- `tests/browser/puzzle-code-copy.html` tested the removed Copy this puzzle link button. **Removed**; its checks that
  still apply moved to the acceptance page (Share and Print disabled without a puzzle, the real clipboard, the shared
  link opening in the real Player, the Share dialog's notes, the keyboard).

Still open:

- `tests/browser/acceptance.html` A1 (44 px targets) is reported as blocked unless the runner emulates a coarse pointer;
  with one, 21 older controls are under 44 px (for example the 28 px zoom buttons of the board tools).
