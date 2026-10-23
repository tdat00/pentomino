// @ts-check
// User-facing generator text (design §10.7) and the small UI vocabulary shared by the panels.
// Pure data: no DOM access, so notices can be tested and reused by the job and result panels.

/** @typedef {Record<string, string | number>} NoticeParams */

/** @type {Readonly<Record<string, string | Readonly<Record<string, string>>>>} */
export const NOTICES = Object.freeze({
  'N-COUNT': 'This board uses {kmin}–{kmax} pieces at {level}, about {share} % pre-placed.',
  'N-LEVELS': Object.freeze({
    above: 'Levels above {highest} need a larger board.',
    below: 'Levels below {lowest} need a smaller board.',
  }),
  'N-PARTIAL': 'Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed.',
  'N-FEWLAYOUTS': 'Found {n} of {q} different {level} puzzles; no more were found. This piece set may allow only a few different arrangements — generate a new piece set for more.',
  'N-ARRANGEMENTS': Object.freeze({
    all: 'Found {n}/{total} arrangements, the most this piece set allows. Generate a new piece set for more {level} puzzles.',
    rest: 'Found {n}/{n} remaining arrangements ({total} in total), the most this piece set has left. Generate a new piece set for more {level} puzzles.',
    none: 'This piece set has no arrangements left: all {total} have been used. Generate a new piece set for more {level} puzzles.',
  }),
  'N-LAYOUTS-LEFT': 'Found {n} of {q} different {level} puzzles. This piece set has more arrangements, but none gave another {level} puzzle in the search. Try again, or generate a new piece set for more.',
  'N-LAYOUTS-UNUSED': Object.freeze({
    all: 'Found {n} of {q} different {level} puzzles. Every other arrangement of this piece set ({count}) was tried, and none has a {clueset}. Generate a new piece set for more {level} puzzles.',
    some: 'Found {n} of {q} different {level} puzzles. The other arrangements tried ({count}) have no {clueset}, and the search did not cover every arrangement of this piece set. Try again, or generate a new piece set for more.',
  }),
  'N-SETLEVEL': 'Found {n} of {q} {level} puzzles: other arrangements of this piece set did not reach {level} difficulty. Try again, or generate a new piece set for {level}.',
  'N-NOSET': "Couldn't create a {level} piece set for this board within the time limit. Try again, choose another level, or change the board.",
  'N-UNIQUE': "Found {n} of {q} {level} puzzles with exactly one solution. Turn off 'Require one solution' or choose another level.",
  'N-UNIQUE-EXP': "On large Hell puzzles, 'Require one solution' is experimental and usually fails.",
  'N-LARGE': 'Large board: generation can take up to 2 minutes.',
  'N-EXPERIMENTAL': 'Experimental: boards above {limit} squares may not finish all {q} puzzles within 2 minutes.',
  'N-CAP': 'This board has {area} playable squares; the limit on this device is {max}.',
  'N-SMALL': 'A board needs at least 30 playable squares to generate puzzles.',
  'N-TOOLARGE': 'This board and level need more memory than allowed. Choose a smaller board or a lower level.',
  'N-STALE': 'Board changed — generate a new piece set.',
  'N-LONGLINK': 'This link is long; some apps may cut it. Use Export file to share.',
  'N-NOWORKER': 'This browser cannot run the generator (module workers are required).',
});

/**
 * Fills `{name}` placeholders. A missing parameter or unknown code is a programming error.
 * @param {string} code A key of NOTICES.
 * @param {NoticeParams} [params]
 * @param {string} [variant] Required for codes with variants (N-LEVELS: 'above' | 'below').
 * @returns {string}
 */
export function formatNotice(code, params = {}, variant) {
  if (!Object.hasOwn(NOTICES, code)) {
    throw new RangeError(`unknown notice: ${code}`);
  }
  const entry = NOTICES[code];
  let template;
  if (typeof entry === 'string') {
    template = entry;
  } else if (variant !== undefined && Object.hasOwn(entry, variant)) {
    template = entry[variant];
  } else {
    throw new RangeError(`notice ${code} needs a variant: ${Object.keys(entry).join(' | ')}`);
  }
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(params, name)) {
      throw new RangeError(`notice ${code} is missing {${name}}`);
    }
    return String(params[name]);
  });
}

export const LEVEL_REASONS = Object.freeze({
  larger: 'needs a larger board',
  smaller: 'needs a smaller board',
});

/** Texts of the job and result code that the design's N-* table does not cover. */
export const MESSAGES = Object.freeze({
  'M-CANCELLED-SET': 'Cancelled. No new piece set was created; the current piece set was not changed.',
  'M-CANCELLED-BATCH': 'Cancelled. Kept {n} of {q} {level} puzzles. The piece set was not changed.',
  'M-CANCELLED-IMPORT': 'Cancelled. Your current work was not changed.',
  'M-FAILED': 'Generation stopped: {message}',
  'M-HISTORY-FULL': 'This piece set remembers {used} of {max} arrangements and has room for {room} more puzzles, fewer than the {q} requested. Reset the history (earlier puzzles may then appear again) or ask for fewer.',
  'M-PACK-FULL': 'A pack holds at most {max} puzzles. Export these, then use New Puzzles to start another pack.',
  'M-SPLIT': 'The pack grew past the {kib} KiB file limit, so the earlier {n} puzzles are kept as a separate pack. Export both packs.',
  'M-FEWPIECES': 'This set has fewer than 3 pieces, so new puzzles cannot be generated (one clue plus two movable pieces are needed). You can still view and export it.',
  'M-NOWITNESS': 'No arrangement of this set was found within the search limit, so new puzzles cannot be generated. You can still view and export it.',
  'M-NOARRANGEMENT': 'No arrangement of these pieces fills the board, so new puzzles cannot be generated. You can still view and export it.',
  'M-LEVEL-NOT-OFFERED': '{level} is not offered for a board of {area} playable squares.',
  'M-IMPORTED': 'Imported {pieces} pieces and {puzzles} puzzles. Ratings and certificates from a file are claims until checked.',
  'M-IMPORT-HISTORY': 'The earlier history of this piece set is not part of the file, so new puzzles may repeat arrangements generated before.',
  'M-IMPORT-FAILED': 'Could not import: {reason} Your current work was not changed.',
  'M-IMPORT-TOOBIG': 'The file is larger than the {kib} KiB limit.',
  'M-LINK-COPIED': 'Link copied.',
  'M-COPY-FAILED': "Couldn't copy the link. Use Export file to share instead.",
  'M-EXPORT-FAILED': 'This pack is too large to export as one file. Remove some puzzles and try again.',
  'M-PLAYER-UNAVAILABLE': "This puzzle is too large for a link and can't be saved in this browser — use Export, then Import file in the player.",
  'M-NEEDS-SET': 'Generate or import a piece set first.',
});

/**
 * @param {string} code A key of MESSAGES.
 * @param {NoticeParams} [params]
 * @returns {string}
 */
export function formatMessage(code, params = {}) {
  if (!Object.hasOwn(MESSAGES, code)) {
    throw new RangeError(`unknown message: ${code}`);
  }
  return MESSAGES[code].replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(params, name)) {
      throw new RangeError(`message ${code} is missing {${name}}`);
    }
    return String(params[name]);
  });
}

export const CERTIFICATE_TEXT = Object.freeze({
  checking: 'Checking…',
  unchecked: 'Uniqueness not checked',
  unique: 'Unique solution ✓',
  multiple: 'Several solutions',
  'not-proved': 'Uniqueness not proved',
  unsatisfiable: 'No solution exists',
  claimed: ' (claimed)',
});

export const VERIFY_TEXT = Object.freeze({
  checking: 'Checking solvability…',
  solvable: 'Solvable ✓',
  unsatisfiable: 'No solution exists',
  'not-verified': 'Not verified',
});

export const STAGE_TEXT = Object.freeze({
  starting: 'Starting…',
  carving: 'Building the piece set',
  candidate: 'Rating candidates',
  enumerate: 'Counting the arrangements of this piece set',
  cancelling: 'Cancelling…',
  import: 'Looking for an arrangement of the imported pieces',
  verify: 'Checking',
  memory: 'Working',
  search: 'Searching',
});

export const CONFIRM_STALE = 'The current piece set belongs to the board as it is now. Editing the board makes it outdated; its puzzles stay playable and exportable. Continue?';
export const CONFIRM_RESIZE = 'Resizing keeps the cells that still fit and makes new cells playable. Continue?';
export const CONFIRM_RESET = 'Reset the board to the default 10 × 6 rectangle?';
export const SEED_PROBLEM = 'Enter a seed of 1–64 characters, or turn off Keep seed.';
export const GENERATION_PENDING = 'Generation is not available yet.';

export const STATUS = Object.freeze({
  separator: ' · ',
  connected: 'connected',
  playable: 'playable squares',
});

export const PRESET_LABELS = Object.freeze({
  rectangle: 'Rectangle',
  heart: 'Heart',
  diamond: 'Diamond',
  cross: 'Cross',
  ring: 'Ring',
});

export const STEP_TITLES = Object.freeze({
  board: 'Board',
  level: 'Level',
  set: 'Piece set',
  puzzles: 'Puzzles',
});
