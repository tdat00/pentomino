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
 */

/**
 * @template T
 * @typedef {{ ok: true, value: T, warnings: Issue[] } | { ok: false, issues: Issue[] }} Result
 */

/**
 * @typedef {object} Metrics
 * @property {number} U
 * @property {number} B
 * @property {number} branchTrials
 * @property {number} rowTrials
 * @property {'solution' | 'branch-cap' | 'row-cap'} stop
 * @property {number} R
 * @property {number} H
 */

/**
 * @typedef {object} Rating
 * @property {'difficulty-v2'} model
 * @property {number} score
 * @property {string} level
 * @property {boolean} saturated
 * @property {Metrics} metrics
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
 * @property {Pose[]} clues
 * @property {Pose[] | null} solution
 * @property {Rating | null} rating
 * @property {Certificate | null} certificate
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
 * Invalid request arguments are typed control errors, not a failed-search result.
 * @typedef {{ ok: true, set: PieceSet, calibration: Puzzle, attempt: number }
 *   | { ok: false, reason: 'carve' | 'internal' | 'not-in-band' | 'uniqueness-not-proved' }} SetAttemptResult
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
 * @property {EngineExecution} execution
 */

/**
 * @typedef {object} PuzzleCandidate
 * @property {Pose[]} layout
 * @property {string} layoutKey
 * @property {string} clueKey
 * @property {Pose[]} clues
 * @property {Rating} rating
 * @property {Certificate | null} certificate
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

export {};
