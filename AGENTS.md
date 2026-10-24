# Agent instructions

## Documentation

- The living specification is `docs/design-brief.md` and `docs/design-detail.md`. They must always describe the current code: when a change alters behaviour, storage, URLs or UI, update these two files in the same change.
- Do not edit files in subfolders of `docs/` (`docs/init-design/`, `docs/calibration/`, ...) or in `tasks/`. They record the original design, reviews and measurements and stay as written.
- `README.md` is user-facing; keep its feature list and commands correct.

## Checks

- `npm run check` checks repository conventions (CRLF line endings, no trailing whitespace, final newline) and the site files.
- `npm run test:quick` runs the unit tests without the slow ones; `npm test` runs all of them.
