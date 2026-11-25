// @ts-check
// JSDoc-only shared contracts. Module-specific game, fold, render and transport
// types are exported by their owning modules, not here.

/** @typedef {[number, number]} XY Cell or offset as [x, y]; x grows right, y grows down. */
/** @typedef {0 | 1 | 2 | 3} Turn Clockwise quarter turns. */

/**
 * A pose mirrors x first, turns clockwise, normalizes, then adds its origin.
 * @typedef {object} Pose
 * @property {string} piece
 * @property {number} x
 * @property {number} y
 * @property {Turn} turn
 * @property {boolean} mirrored
 */

/**
 * @typedef {object} Board
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} active
 */

/**
 * @typedef {object} Piece
 * @property {string} id
 * @property {string} label
 * @property {string} color
 * @property {XY[]} cells
 */

/**
 * `macroRegion[i]` belongs to `pieces[i]`, even when solver columns use another order.
 * @typedef {object} PieceSet
 * @property {Board} board
 * @property {Piece[]} pieces
 * @property {Pose[] | null} witness
 * @property {'macro' | 'flat' | 'imported'} carving
 * @property {number[] | null} macroRegion
 */

/**
 * @typedef {object} Issue
 * @property {string} code
 * @property {string} path
 * @property {string} message
 * @property {Record<string, string | number>} [params]
 */

/**
 * @template T
 * @typedef {{ ok: true, value: T, warnings: Issue[] } | { ok: false, issues: Issue[] }} Result
 */

/**
 * `difficulty-v2` metrics: the bounded DLX effort of the rating traversal.
 * @typedef {object} MetricsV2
 * @property {number} U Pieces left to place.
 * @property {number} B Effective (capped) branch trials, the value the v2 score uses.
 * @property {number} branchTrials
 * @property {number} rowTrials
 * @property {'solution' | 'branch-cap' | 'row-cap'} stop
 * @property {number} R
 * @property {number} H
 */

/**
 * Alias of `MetricsV2`, kept for the code that rates with `difficulty-v2`.
 * @typedef {MetricsV2} Metrics
 */

/**
 * `difficulty-v3` metrics (design §7.10): fixed field order, every field present in a computed rating.
 * @typedef {object} MetricsV3
 * @property {number} U Pieces left to place, as v2.
 * @property {number} R Free cells, as v2.
 * @property {number} H Mean log2(1 + placements) per piece to place, as v2.
 * @property {number} B DLX diagnostic, v2 meaning (the capped value); never enters the v3 score.
 * @property {number} branchTrials DLX diagnostic, v2 meaning.
 * @property {number} rowTrials DLX diagnostic, v2 meaning.
 * @property {'solution' | 'branch-cap' | 'row-cap' | 'skipped'} dlxStop The v2 `stop`, renamed; 'skipped' only in the
 *   search ratings of selectClues (P6), never stored.
 * @property {'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap'} searchStop How the deduction search ended.
 * @property {number} F Final-path placements by R1, R2 and R3.
 * @property {number} E Final-path rows killed by R6.
 * @property {{ R1: number, R2: number, R3: number, R4: number, R5: number, R6: number, R7: number, R8: number, R9: number }} rules
 *   Final-path counts: placements for R1-R3, killed rows for R4-R9.
 * @property {0 | 1 | 2 | 3} deductionTier Highest tier of a rule with a nonzero count; the score uses it.
 * @property {0 | 1 | 2 | 3 | 4} tier Deduction tier, 4 when a decisive guess was needed.
 * @property {number} G Decisive guesses on the final path.
 * @property {number} info Decisive information (the full double, not quantised); 0 when G = 0.
 * @property {number} Cmax Widest decisive guess; 0 when G = 0.
 * @property {number} Dmax Placement depth of the deepest decisive guess; 0 when G = 0.
 * @property {number} Gt Guess nodes of the main search (the census is not counted).
 * @property {number} nodes Search nodes, main search and census.
 * @property {number} work Search work units, setup and census included.
 * @property {number} S Solutions counted, at most `solutionLimit`.
 * @property {number} solutionLimit The count limit used (`DEDUCE.solutions`).
 * @property {'unique' | 'few' | 'many' | 'unknown'} solutions The count status; the score penalises few and many.
 * @property {boolean} censusComplete Whether every alternative of the final path was decided.
 * @property {number} censusUndecided Alternatives left undecided.
 * @property {number} censusNodes Census share of `nodes`.
 * @property {number} censusWork Census share of `work`.
 * @property {number} Gproved Final-path guess nodes with an alternative proved impossible; G when the census is
 *   complete; not a score input.
 */

/**
 * @typedef {object} RatingV2
 * @property {'difficulty-v2'} model
 * @property {number} score
 * @property {string} level
 * @property {boolean} saturated
 * @property {MetricsV2} metrics
 */

/**
 * @typedef {object} RatingV3
 * @property {'difficulty-v3'} model
 * @property {number} score
 * @property {string} level
 * @property {false} saturated
 * @property {true} [censored] Present exactly when the census is unfinished.
 * @property {MetricsV3} metrics
 */

/**
 * Discriminated by `model`. The engine produces `RatingV3` only (`rate` is `difficulty-v3`); `RatingV2` describes
 * stored claims.
 * @typedef {RatingV2 | RatingV3} Rating
 */

/**
 * Owned copy of one rating's deduction data (RES-19): plain JSON, no typed arrays, never shared with the workspace.
 * @typedef {object} RatingDetail
 * @property {'complete'} path
 * @property {{ F: number, E: number, rules: { R1: number, R2: number, R3: number, R4: number, R5: number, R6: number,
 *   R7: number, R8: number, R9: number }, deductionTier: number, G: number, Gproved: number, info: number,
 *   Cmax: number, Dmax: number, choices: number[], rows: number[],
 *   census: { c: number, kLow: number, f: number, u: number }[] }} first
 * @property {{ Gt: number, nodes: number, work: number, stop: string }} search
 * @property {{ S: number, limit: number, exhausted: boolean, solutions: string }} count
 * @property {{ complete: boolean, undecided: number, nodes: number, work: number }} census
 */

/**
 * @typedef {object} Certificate
 * @property {'unique' | 'multiple' | 'not-proved' | 'unsatisfiable'} status
 * @property {'dlx-v1'} model
 * @property {number} rowLimit
 * @property {boolean} verified
 */

/**
 * @typedef {object} Puzzle
 * @property {string} id
 * @property {string} [title]
 * @property {string} [seed] Batch seed the puzzle was generated with, when known.
 * @property {Pose[]} clues
 * @property {Pose[] | null} solution
 * @property {Rating | null} rating
 * @property {Certificate | null} certificate
 * @property {{ wc: number } | null} [igWindow] A session calibration may carry the window count of its set (gen-v4); it is never stored in a pack.
 */

/**
 * @typedef {object} RatingClaim
 * @property {string} model
 * @property {number} score
 * @property {string} level
 * @property {boolean} [saturated]
 * @property {boolean} [censored]
 * @property {object} [metrics]
 */

/**
 * @typedef {object} CertificateClaim
 * @property {Certificate['status']} status
 * @property {string} model
 * @property {number} [rowLimit]
 */

/**
 * @typedef {object} PackPuzzle
 * @property {string} id
 * @property {string} [title]
 * @property {string} [seed] Batch seed the puzzle was generated with, when known.
 * @property {Pose[]} clues
 * @property {Pose[] | null} [solution]
 * @property {RatingClaim | null} [rating]
 * @property {CertificateClaim | null} [certificate]
 */

/**
 * @typedef {object} Pack
 * @property {'pentomino-pack'} format
 * @property {1} version
 * @property {'piece-set' | 'puzzle-pack'} kind
 * @property {'free-polyomino-v1'} rules
 * @property {{ rows: string[] }} board
 * @property {{ rotation: number }} [presentation] Counter-clockwise angle; never affects generation identity or seeds.
 * @property {Piece[]} pieces
 * @property {Pose[] | null} [witness]
 * @property {PackPuzzle[]} puzzles
 * @property {object} [generation]
 * @property {object} [meta]
 */

/**
 * Opaque scratch-memory handle owned by the engine workspace module.
 * @typedef {object} Workspace
 */

/**
 * Engine-only, injected by the worker, never structured-cloned.
 * @typedef {object} EngineExecution
 * @property {Workspace} main
 * @property {Workspace} scratch
 * @property {(progress: object) => void} [onProgress]
 */

/**
 * @typedef {object} SetRequest
 * @property {Board} board
 * @property {number} rotation
 * @property {string} levelId
 * @property {string} seedText
 * @property {'any' | 'require'} uniqueness
 * @property {EngineExecution} execution
 */

/**
 * @typedef {{ budgetStops: number, screenCapped: number, rescueReratings: number, tailReratings: number }} SelectCounters
 */

/**
 * Invalid request arguments are typed control errors, not a failed-search result. `counters` are the selection
 * counters of the call (all zero for a `gen-v3` selection or a call that never selected).
 * @typedef {{ ok: true, set: PieceSet, calibration: Puzzle, attempt: number, counters: SelectCounters }
 *   | { ok: false, reason: 'carve' | 'internal' | 'not-in-band' | 'uniqueness-not-proved' | 'no-window-below'
 *     | 'no-window-above', counters: SelectCounters }} SetAttemptResult
 */

/**
 * `quantity` is 1-10.
 * @typedef {object} BatchContext
 * @property {PieceSet} set
 * @property {string} targetLevelId
 * @property {number} quantity
 * @property {string} batchSeed
 * @property {'any' | 'require'} uniqueness
 * @property {ReadonlySet<string>} seenLayouts
 * @property {ReadonlySet<string>} seenClues
 * @property {Puzzle} [calibration]
 * @property {number} [igPrior] The per-set override of P4 (gen-v4, Hell 1).
 * @property {EngineExecution} execution
 */

/**
 * Version ids of the code that made a set or a puzzle (RES-27).
 * @typedef {object} ProvenanceVersions
 * @property {string} algo
 * @property {string} policy
 * @property {string} rng
 * @property {string} seedScheme
 * @property {string} ratingModel
 * @property {string} [priorTable] The gen-v4 family only.
 * @property {string} [screenTable] The gen-v4 family only.
 */

/**
 * `generation.setOrigin` (RES-27): how the piece set was made. Written once, when the set is made; never
 * re-stamped.
 * @typedef {object} SetOrigin
 * @property {1} schema
 * @property {string} seed Normalized set seed.
 * @property {string} level Level id the set was made for.
 * @property {number} attempt Winning set attempt.
 * @property {'any' | 'require'} uniqueness
 * @property {ProvenanceVersions} versions
 */

/**
 * Skip ordinals of one clue selection (RES-27), or 'overflow' above 64 subset or 16 repair ordinals.
 * @typedef {{ subsets: number[], repairs: number[] } | 'overflow'} Skips
 */

/**
 * One entry of `generation.made`, by puzzle id (RES-27).
 * @typedef {{ schema: 1, kind: 'calibration' }
 *   | { schema: 1, kind: 'candidate', batchSeed: string, targetLevel: string, uniqueness: 'any' | 'require',
 *       slot: number, attempt: number, start: 'witness' | 'restart', skips: Skips, igPrior?: number | null,
 *       versions: ProvenanceVersions }
 *   | { schema: 1, kind: 'completion' }} Made
 */

/**
 * @typedef {object} PuzzleCandidate
 * @property {Pose[]} layout
 * @property {string} layoutKey
 * @property {string} clueKey
 * @property {Pose[]} clues
 * @property {Rating} rating
 * @property {Certificate | null} certificate
 * @property {SelectCounters} [counters] The selection counters of the call.
 * @property {Made} made Origin of the candidate (RES-27); set by every engine candidate function and carried
 *   unchanged by the fold.
 */

/**
 * @typedef {object} BatchResult
 * @property {'complete' | 'partial' | 'cancelled'} status
 * @property {Pack} [pack]
 * @property {Puzzle[]} accepted
 * @property {string[]} seenLayouts
 * @property {string[]} seenClues
 * @property {'layouts-not-found' | 'difficulty-not-found' | 'uniqueness-not-proved' | 'time-limit'} [reason]
 */

/**
 * The band of a clue event: `max` is null for an unbounded band (RES-15).
 * @typedef {{ min: number, max: number | null }} ClueBand
 */

/**
 * A clue-stage event of `selectClues` and the uniqueness repair (RES-28): plain owned JSON, never mutated after
 * delivery. `source` is the call's `recordSource`; `phase` is the search phase; `sequence` is the subset ordinal
 * and `repairSequence` the repair ordinal of RES-27. A rated subset is an observation, not a selection; the winner
 * is announced by `selected`. The last `repair` event of a finish carries its outcome (`accepted` true or false,
 * `reason` when refused); earlier ones have `rating`, `detail` and `accepted` null.
 * @typedef {{ stage: 'clues', kind: 'rated', source: 'calibration' | 'candidate',
 *     phase: 'sample' | 'seed' | 'beam', sequence: number, clueIds: string[], rating: Rating,
 *     detail: RatingDetail | null, band: ClueBand }
 *   | { stage: 'clues', kind: 'skip', source: 'calibration' | 'candidate', sequence: number }
 *   | { stage: 'clues', kind: 'unrateable', source: 'calibration' | 'candidate',
 *     phase: 'sample' | 'seed' | 'beam', sequence: number, clueIds: string[], reason: 'path-capped',
 *     band: ClueBand }
 *   | { stage: 'clues', kind: 'rejected', source: 'calibration' | 'candidate',
 *     phase: 'sample' | 'seed' | 'beam', sequence: number, clueIds: string[], rating: Rating,
 *     detail: RatingDetail | null, band: ClueBand, reason: 'no-proved-guess' }
 *   | { stage: 'unique', kind: 'repair', source: 'calibration' | 'candidate', repairSequence: number,
 *     addedId: string | null, clues: Pose[], rating: Rating | null, detail: RatingDetail | null,
 *     accepted: boolean | null,
 *     reason?: 'not-proved' | 'path-capped' | 'no-proved-guess' | 'out-of-band' | 'excluded' }
 *   | { stage: 'clues', kind: 'selected', source: 'calibration' | 'candidate', sequence: number,
 *     repairSequence: number | null }} ClueEvent
 */

/**
 * A set-stage event of the piece-set attempt (RES-28): plain owned JSON, never mutated after delivery; cells are
 * `[x, y]` pairs in ascending cell-index order. `count`: `range` is a copy of the feasible piece counts, `k` the
 * chosen one. `carve`: one per macro partition that reaches carving (`parts` are its parts as cell lists) and one per
 * flat size plan that has sizes (`parts` null). `piece`: the regions of the successful carve, in region order; a
 * discarded partition or a failed plan emits none.
 * @typedef {{ stage: 'set', kind: 'count', range: number[], k: number }
 *   | { stage: 'set', kind: 'carve', mode: 'macro', parts: XY[][] }
 *   | { stage: 'set', kind: 'carve', mode: 'flat', parts: null }
 *   | { stage: 'set', kind: 'piece', cells: XY[] }} SetEvent
 */

/**
 * A layout-stage event of the candidate's walk (RES-28, D32): plain owned JSON, never mutated after delivery.
 * `start`: the walk's starting layout (`start` is where it came from), emitted by `puzzleCandidate` before the walk.
 * `retile`: one per walk step (`step` is the zero-based step, `liftedIds` the piece ids of the released cluster in
 * cluster order, `changed` whether the step moved to another layout, `layout` a copy of the layout after the step).
 * @typedef {{ stage: 'layout', kind: 'start', start: 'witness' | 'restart', layout: Pose[] }
 *   | { stage: 'layout', kind: 'retile', step: number, liftedIds: string[], changed: boolean,
 *     layout: Pose[] }} LayoutEvent
 */

/**
 * Every event a recorder receives (RES-28): the set and layout stages of `setAttempt` and `puzzleCandidate`, then
 * the clue stages of `selectClues`.
 * @typedef {SetEvent | LayoutEvent | ClueEvent} RecordEvent
 */

export {};
