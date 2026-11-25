# T11: the post-hoc reserve and deadline projection of V4-S3P (fr-frozen-none-uncapped, Hell 1, reps 0-4)

Post-hoc projection (D-V4-08), not a live-deadline proof. Written by `docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs`; inputs
`docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection-inputs.json` (6 files, sha256Lf 26445856a9352960d9a23325961bca1b1a0750ea45695c1a76683d16a8563c80). Reserve 0.6, deadline 115000 ms: the set
stage is cut when it ends after 46000 ms; a row serves the puzzles accepted by 115000 ms.

| Cell | rows | valid | projected | reached ten (uncapped) | projected reserve cuts (setCut) | projected lost completions (lost) | completed in the projection | latest set stage end (s) |
|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1 | 5 | 5 | 5 | 4 | 0 | 1 | 3 | 35.3 |
| 20x20-hell-1 | 5 | 5 | 5 | 5 | 0 | 0 | 5 | 4.9 |
| 24x24-hell-1 | 5 | 5 | 5 | 5 | 0 | 0 | 5 | 17.2 |
| 26x26-hell-1 | 5 | 5 | 5 | 5 | 0 | 0 | 5 | 18.0 |

| Row | set stage end (s) | tenth ready (s) | response (s) | accepted | setCut | served | completed | lost |
|---|---|---|---|---|---|---|---|---|
| 14x14-hell-1~0 | 1.0 | 76.8 | 76.9 | 10 | false | 10 | true | false |
| 14x14-hell-1~1 | 31.9 | 128.0 | 128.1 | 10 | false | 8 | false | true |
| 14x14-hell-1~2 | 11.1 | 71.8 | 72.0 | 10 | false | 10 | true | false |
| 14x14-hell-1~3 | 35.3 | - | 150.3 | 2 | false | 2 | false | false |
| 14x14-hell-1~4 | 21.9 | 75.9 | 76.1 | 10 | false | 10 | true | false |
| 20x20-hell-1~0 | 4.2 | 44.1 | 44.2 | 10 | false | 10 | true | false |
| 20x20-hell-1~1 | 4.6 | 42.0 | 42.2 | 10 | false | 10 | true | false |
| 20x20-hell-1~2 | 4.9 | 24.2 | 24.4 | 10 | false | 10 | true | false |
| 20x20-hell-1~3 | 1.4 | 25.9 | 26.1 | 10 | false | 10 | true | false |
| 20x20-hell-1~4 | 4.4 | 26.1 | 26.2 | 10 | false | 10 | true | false |
| 24x24-hell-1~0 | 6.3 | 21.1 | 21.2 | 10 | false | 10 | true | false |
| 24x24-hell-1~1 | 7.5 | 13.0 | 13.1 | 10 | false | 10 | true | false |
| 24x24-hell-1~2 | 2.7 | 20.1 | 20.2 | 10 | false | 10 | true | false |
| 24x24-hell-1~3 | 1.6 | 32.6 | 32.8 | 10 | false | 10 | true | false |
| 24x24-hell-1~4 | 17.2 | 39.5 | 39.6 | 10 | false | 10 | true | false |
| 26x26-hell-1~0 | 2.0 | 40.1 | 40.3 | 10 | false | 10 | true | false |
| 26x26-hell-1~1 | 2.2 | 22.4 | 22.6 | 10 | false | 10 | true | false |
| 26x26-hell-1~2 | 2.1 | 12.6 | 12.8 | 10 | false | 10 | true | false |
| 26x26-hell-1~3 | 2.1 | 19.2 | 19.3 | 10 | false | 10 | true | false |
| 26x26-hell-1~4 | 18.0 | 38.9 | 39.1 | 10 | false | 10 | true | false |
