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
  'N-FEWLAYOUTS': 'Found {n} of {q} different {level} puzzles. This piece set may allow only a few different arrangements — generate a new piece set for more.',
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
