# Verdict manifest (V4-T09a)

The input of `tools/ig-proto/verdicts.mjs` (V4-T09e): the declaration of one admission decision of plan section 5.2
(IG-P-Q19, Q26, Q29, Q30, Q32, Q33, Q35). It names every record the decision reads, with its SHA-256, so that the
verdict is computed only from declared, hash-bound records (review RV3-06); the recipe (`quantity`, `capMs`,
`responseBoundMs`, `resampleSeed`, `resamples`, the declared reps) is written into it before the validation seeds run
(plan section 5.2, "The recipe"). A manifest is a JSON file; a correction is a new file. The row level (which rows are
valid, completion and the capped T10 apart from the deadline, the per-puzzle evidence) is `verdicts.mjs` of V4-T09a;
the manifests of the frozen round are written by V4-T11f's `manifest.mjs verdict-input`.

## Fields

| Field | Value |
|---|---|
| `task` | The task id of the verdict; its records go to `docs/improve-generating/evidence/<label>/<task>/`. |
| `label` | `frozen`. |
| `purpose` | `selection`: the class selection of the validation collection; its phase-0 line is never `pass` (the comparators are not yet resolved). `final`: the final admission after the comparators (RV3-03); it names the class-selection receipt it rests on in `selection`. |
| `quantity` | 10, the puzzles a request must hold to complete. |
| `capMs`, `responseBoundMs` | 120,000 each: the cap of a request's T10 in every ratio statistic (a request that does not reach ten enters at the cap) and the response bound whose breach is a deadline violation, reported apart (D-V4-16). |
| `resampleSeed`, `resamples` | The seed of the resampling generator (an integer) and the number of resamples (10,000); the same resampled seeds apply to every cell of a class. |
| `validationReps` | The declared reps of the validation cells (the class cells, the failing Nightmare cells, the controls and the Hell 1 cells), a list of integers. A declared rep without a valid row is a pairing problem. |
| `masterReps` | The declared reps of the Master identity cells, a list of integers. |
| `collection` | `{ activation: { path, sha256 } \| null, closure: { path, sha256 } \| null }`: the records of the stage-4 collection (V4-T11e) whose rows are judged; `null` when there is none (an example). |
| `selection` | `final` only: `{ path, sha256 }` of the class-selection receipt (`class-selection.json`) the final verdict is based on. Absent for `selection`. |
| `arms` | `[{ id, task, arm, variant, treeId, files: [{ path, sha256 }] }]`: every arm a class, control, Master cell, P5 pair or projection names. `id` is the arm id the other fields use; `task` and `arm` locate its published records, `docs/improve-generating/evidence/<label>/<task>/<arm>/`; `variant` is the tree whose `meta.trees.<variant>` the runs files carry; `treeId` is the tree id every one of its runs files must carry; `files` lists every published runs file of the arm (`*.runs.json`) with its SHA-256. |
| `classes` | `[{ id, cells, screen, noScreen }]`: the screen classes (the freeze's class table); `cells` are the validated cells of the class, `screen` and `noScreen` arm ids. |
| `failingCells` | The failing Nightmare cells judged by the completion gate, cell ids. |
| `controls` | `[{ cell, today }]`: a no-regression control cell and the arm id of today's search on it. |
| `masters` | `[{ cell, today, after }]`: a Master identity cell, the arm ids of today's search and of the arm after the change. |
| `hell1` | The Hell 1 cell ids (reported, not gated). |
| `p5` | For `final`, the expected pairs `[{ cell, bounded, uncapped, reps }]` (arm ids; every rep of `reps` is one expected pair, its seed `landscape/<cell>/<rep>`, `tools/ig-proto/arm.mjs` `oneRowCase`); a row outside the declared pairs is reported, and a declared pair without both rows is unknown. For `selection`, `[]`. |
| `deadlineProjection` | `{ arms, reserves, deadlineMs }`: the arm ids, the reserve shares and the deadline (115,000) of the post-hoc projection, a diagnostic that is labelled `post-hoc projection; not a live deadline gate` and never passes a deadline gate (D-V4-08). |
| `prerequisites` | `{ stage1: { binding, current }, parity: [{ binding, current }], liveDeadline: { binding, current } }`: each `binding` is the path of an accepted proof binding (V4-T04f; D-V4-18) and `current` the arm ids whose tree ids must equal today's trees (`[]` for the historical stage-1 binding; the validated arms for the parity and live-deadline bindings). |

A reader (V4-T09e) refuses a runs file whose SHA-256 differs from the manifest's (`changed evidence`), a runs file in
an arm's folder that its `files` does not declare (`undeclared evidence`) and a file whose `meta.trees.<variant>.treeId`
is not the arm's `treeId` (`stale tree`): each of its rows is then `invalid`.

## Example: purpose `selection`

```json
{
  "task": "V4-S4",
  "label": "frozen",
  "purpose": "selection",
  "quantity": 10,
  "capMs": 120000,
  "responseBoundMs": 120000,
  "resampleSeed": 20261116,
  "resamples": 10000,
  "validationReps": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  "masterReps": [20, 21, 22, 23, 24],
  "collection": {
    "activation": { "path": "docs/improve-generating/evidence/frozen/V4-S4/activation.json", "sha256": "<sha256 of the file>" },
    "closure": null
  },
  "arms": [
    {
      "id": "fr-frozen",
      "task": "V4-S4",
      "arm": "fr-frozen",
      "variant": "fr-frozen",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/fr-frozen/val-10x10-master.runs.json", "sha256": "<sha256 of the file>" },
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/fr-frozen/val-12x12-nightmare.runs.json", "sha256": "<sha256 of the file>" }
      ]
    },
    {
      "id": "fr-frozen-none",
      "task": "V4-S4",
      "arm": "fr-frozen-none",
      "variant": "fr-frozen-none",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/fr-frozen-none/val-12x12-nightmare.runs.json", "sha256": "<sha256 of the file>" }
      ]
    },
    {
      "id": "log-link",
      "task": "V4-S4",
      "arm": "log-link",
      "variant": "log-link",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/log-link/val-10x10-master.runs.json", "sha256": "<sha256 of the file>" }
      ]
    }
  ],
  "classes": [
    { "id": "n-small", "cells": ["12x12-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" }
  ],
  "failingCells": ["12x12-nightmare"],
  "controls": [],
  "masters": [{ "cell": "10x10-master", "today": "log-link", "after": "fr-frozen" }],
  "hell1": [],
  "p5": [],
  "deadlineProjection": { "arms": ["fr-frozen", "fr-frozen-none"], "reserves": [0.3, 0.4, 0.5], "deadlineMs": 115000 },
  "prerequisites": {
    "stage1": { "binding": "docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json", "current": [] },
    "parity": [
      { "binding": "docs/improve-generating/evidence/frozen/V4-S4P/parity-fr-frozen.accepted.json", "current": ["fr-frozen"] }
    ],
    "liveDeadline": {
      "binding": "docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json",
      "current": ["fr-frozen", "fr-frozen-none"]
    }
  }
}
```

## Example: purpose `final`

The comparator arms are published by the resolved comparator plan (V4-T11f); `selection` names the receipt of the
selection that resolved them, and `p5` declares every expected pair.

```json
{
  "task": "V4-S4F",
  "label": "frozen",
  "purpose": "final",
  "quantity": 10,
  "capMs": 120000,
  "responseBoundMs": 120000,
  "resampleSeed": 20261116,
  "resamples": 10000,
  "validationReps": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  "masterReps": [20, 21, 22, 23, 24],
  "collection": {
    "activation": { "path": "docs/improve-generating/evidence/frozen/V4-S4/activation.json", "sha256": "<sha256 of the file>" },
    "closure": null
  },
  "selection": { "path": "docs/improve-generating/evidence/frozen/V4-S4/class-selection.json", "sha256": "<sha256 of the file>" },
  "arms": [
    {
      "id": "fr-frozen",
      "task": "V4-S4",
      "arm": "fr-frozen",
      "variant": "fr-frozen",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/fr-frozen/val-12x12-nightmare.runs.json", "sha256": "<sha256 of the file>" }
      ]
    },
    {
      "id": "fr-frozen-none",
      "task": "V4-S4",
      "arm": "fr-frozen-none",
      "variant": "fr-frozen-none",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4/fr-frozen-none/val-12x12-nightmare.runs.json", "sha256": "<sha256 of the file>" }
      ]
    },
    {
      "id": "fr-frozen-uncapped",
      "task": "V4-S4C",
      "arm": "fr-frozen-uncapped",
      "variant": "fr-frozen-uncapped",
      "treeId": "<tree id>",
      "files": [
        { "path": "docs/improve-generating/evidence/frozen/V4-S4C/fr-frozen-uncapped/val-12x12-nightmare.runs.json", "sha256": "<sha256 of the file>" }
      ]
    }
  ],
  "classes": [
    { "id": "n-small", "cells": ["12x12-nightmare"], "screen": "fr-frozen", "noScreen": "fr-frozen-none" }
  ],
  "failingCells": ["12x12-nightmare"],
  "controls": [],
  "masters": [],
  "hell1": [],
  "p5": [
    {
      "cell": "12x12-nightmare",
      "bounded": "fr-frozen",
      "uncapped": "fr-frozen-uncapped",
      "reps": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]
    }
  ],
  "deadlineProjection": { "arms": ["fr-frozen"], "reserves": [0.3, 0.4, 0.5], "deadlineMs": 115000 },
  "prerequisites": {
    "stage1": { "binding": "docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json", "current": [] },
    "parity": [],
    "liveDeadline": {
      "binding": "docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json",
      "current": ["fr-frozen"]
    }
  }
}
```

The two examples are illustrations of the shape, not records: their hashes and tree ids are placeholders, the arms
and cells are abridged to what shows the fields, and no file named in them is claimed to exist.
