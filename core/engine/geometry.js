// @ts-check
// Square-cell polyomino geometry: the eight D4 transforms, canonical shape
// identity, connectivity, holes and SVG-ready boundary loops. Pure and
// dependency-free; supplied arrays are never mutated.

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */

// Index t = 4f + r means R^r after M^f (mirror x first, then r clockwise turns).
// x grows right and y grows down, so R(x, y) = (-y, x) is clockwise on screen.
/** @type {readonly ((p: XY) => XY)[]} */
export const TRANSFORMS = Object.freeze([
  ([x, y]) => [x, y],
  ([x, y]) => [-y, x],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, -x],
  ([x, y]) => [-x, y],
  ([x, y]) => [-y, -x],
  ([x, y]) => [x, -y],
  ([x, y]) => [y, x],
]);

/**
 * @param {number} t
 * @returns {number}
 */
function checkedT(t) {
  if (!Number.isInteger(t) || t < 0 || t > 7) {
    throw new RangeError(`transform index must be an integer 0..7, got ${t}`);
  }
  return t;
}

/** Normalizes -0 to 0 so coordinates compare and print consistently. */
const plain = (/** @type {number} */ n) => (n === 0 ? 0 : n);

/**
 * Applies transform t without normalizing.
 * @param {XY[]} cells
 * @param {number} t
 * @returns {XY[]}
 */
export function transformCells(cells, t) {
  const fn = TRANSFORMS[checkedT(t)];
  return cells.map((cell) => {
    const [x, y] = fn(cell);
    return [plain(x), plain(y)];
  });
}

/**
 * Translates to min x = min y = 0 and sorts numerically by (y, x).
 * @param {XY[]} cells
 * @returns {XY[]}
 */
export function normalizeCells(cells) {
  if (cells.length === 0) {
    return [];
  }
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  }
  /** @type {XY[]} */
  const out = cells.map(([x, y]) => [plain(x - minX), plain(y - minY)]);
  out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return out;
}

/**
 * Transform then normalize.
 * @param {XY[]} cells
 * @param {number} t
 * @returns {XY[]}
 */
export function orientedCells(cells, t) {
  return normalizeCells(transformCells(cells, t));
}

/**
 * Absolute board cells of a pose: transform, normalize, translate by (x, y).
 * @param {Piece} piece
 * @param {Pose} pose
 * @returns {XY[]}
 */
export function poseCells(piece, pose) {
  const t = (pose.mirrored ? 4 : 0) + pose.turn;
  return orientedCells(piece.cells, t).map(([x, y]) => [x + pose.x, y + pose.y]);
}

/**
 * Numeric lexicographic comparison of two normalized cell lists.
 * @param {XY[]} a
 * @param {XY[]} b
 * @returns {number}
 */
function compareCells(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const d = a[i][1] - b[i][1] || a[i][0] - b[i][0];
    if (d !== 0) {
      return d;
    }
  }
  return a.length - b.length;
}

/**
 * @param {XY[]} a
 * @param {XY[]} b
 * @returns {boolean}
 */
function sameCells(a, b) {
  return compareCells(a, b) === 0;
}

/**
 * Identity of a shape under translation, rotation and reflection:
 * "<count>:x,y;x,y;..." of the numerically smallest normalized variant.
 * @param {XY[]} cells
 * @returns {string}
 */
export function canonicalKey(cells) {
  /** @type {XY[] | null} */
  let best = null;
  for (let t = 0; t < 8; t += 1) {
    const variant = orientedCells(cells, t);
    if (best === null || compareCells(variant, best) < 0) {
      best = variant;
    }
  }
  const chosen = best ?? [];
  return `${chosen.length}:${chosen.map(([x, y]) => `${x},${y}`).join(';')}`;
}

/**
 * One entry per different normalized cell set, keeping the smallest t, ascending.
 * @param {XY[]} cells
 * @returns {{ t: number, cells: XY[] }[]}
 */
export function distinctOrientations(cells) {
  /** @type {{ t: number, cells: XY[] }[]} */
  const out = [];
  for (let t = 0; t < 8; t += 1) {
    const variant = orientedCells(cells, t);
    if (!out.some((entry) => sameCells(entry.cells, variant))) {
      out.push({ t, cells: variant });
    }
  }
  return out;
}

/**
 * Smallest t' whose oriented cells equal those of t.
 * @param {XY[]} cells
 * @param {number} t
 * @returns {number}
 */
export function canonicalT(cells, t) {
  const target = orientedCells(cells, checkedT(t));
  for (let u = 0; u < t; u += 1) {
    if (sameCells(orientedCells(cells, u), target)) {
      return u;
    }
  }
  return t;
}

// COMPOSE_TABLE[a][b] is the index of T_a after T_b, read off the images of
// the unit vectors, which determine a D4 element uniquely.
const COMPOSE_TABLE = (() => {
  /** @type {XY[]} */
  const probes = [[1, 0], [0, 1]];
  const images = TRANSFORMS.map((fn) => probes.map((p) => fn(p)));
  return TRANSFORMS.map((fa) =>
    TRANSFORMS.map((fb) => {
      const want = probes.map((p) => fa(fb(p)));
      return images.findIndex((img) =>
        img.every((q, i) => plain(q[0]) === plain(want[i][0]) && plain(q[1]) === plain(want[i][1])));
    }));
})();

/**
 * Index of T_a ∘ T_b (b applies first).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function compose(a, b) {
  return COMPOSE_TABLE[checkedT(a)][checkedT(b)];
}

/**
 * @param {number} t
 * @returns {number}
 */
export function rotateCW(t) {
  checkedT(t);
  return (t & 4) | (((t & 3) + 1) % 4);
}

/**
 * @param {number} t
 * @returns {number}
 */
export function rotateCCW(t) {
  checkedT(t);
  return (t & 4) | (((t & 3) + 3) % 4);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
const cellKey = (x, y) => `${x},${y}`;

const NEIGHBORS = /** @type {const} */ ([[1, 0], [-1, 0], [0, 1], [0, -1]]);

/**
 * True when all cells form one component through shared sides. Empty is not connected.
 * @param {XY[]} cells
 * @returns {boolean}
 */
export function isConnected(cells) {
  if (cells.length === 0) {
    return false;
  }
  const remaining = new Set(cells.map(([x, y]) => cellKey(x, y)));
  const [sx, sy] = cells[0];
  const stack = [[sx, sy]];
  remaining.delete(cellKey(sx, sy));
  while (stack.length > 0) {
    const [x, y] = /** @type {number[]} */ (stack.pop());
    for (const [dx, dy] of NEIGHBORS) {
      const k = cellKey(x + dx, y + dy);
      if (remaining.delete(k)) {
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return remaining.size === 0;
}

/**
 * True when empty cells inside the bounding box cannot reach the outside
 * through the padded complement (four-neighbour flood fill).
 * @param {XY[]} cells
 * @returns {boolean}
 */
export function hasHole(cells) {
  if (cells.length === 0) {
    return false;
  }
  const filled = new Set(cells.map(([x, y]) => cellKey(x, y)));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  minX -= 1;
  minY -= 1;
  maxX += 1;
  maxY += 1;
  const seen = new Set([cellKey(minX, minY)]);
  const stack = [[minX, minY]];
  while (stack.length > 0) {
    const [x, y] = /** @type {number[]} */ (stack.pop());
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const k = cellKey(nx, ny);
      if (nx < minX || nx > maxX || ny < minY || ny > maxY || filled.has(k) || seen.has(k)) {
        continue;
      }
      seen.add(k);
      stack.push([nx, ny]);
    }
  }
  const area = (maxX - minX + 1) * (maxY - minY + 1);
  return seen.size + filled.size < area;
}

/**
 * Boundary polygons of a cell set, for SVG `fill-rule="evenodd"`. Outer loops
 * run clockwise on screen and hole loops counter-clockwise; collinear vertices
 * are merged. At a corner contact every loop keeps turning around its own
 * cells, so touching contours stay separate. Loops are ordered by their
 * (y, x)-smallest vertex, which is also each loop's first vertex.
 * @param {XY[]} cells
 * @returns {XY[][]}
 */
export function outlineLoops(cells) {
  const filled = new Set(cells.map(([x, y]) => cellKey(x, y)));
  /** @type {Map<string, { x1: number, y1: number, x2: number, y2: number, next: number }>} */
  const edges = new Map();
  /** @type {Map<string, string[]>} */
  const outgoing = new Map();
  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   */
  const addEdge = (x1, y1, x2, y2) => {
    const reverse = `${x2},${y2}>${x1},${y1}`;
    if (edges.delete(reverse)) {
      const list = /** @type {string[]} */ (outgoing.get(`${x2},${y2}`));
      list.splice(list.indexOf(reverse), 1);
      return;
    }
    const id = `${x1},${y1}>${x2},${y2}`;
    edges.set(id, { x1, y1, x2, y2, next: -1 });
    const from = `${x1},${y1}`;
    const list = outgoing.get(from);
    if (list === undefined) {
      outgoing.set(from, [id]);
    } else {
      list.push(id);
    }
  };
  for (const key of filled) {
    const [x, y] = key.split(',').map(Number);
    addEdge(x, y, x + 1, y);
    addEdge(x + 1, y, x + 1, y + 1);
    addEdge(x + 1, y + 1, x, y + 1);
    addEdge(x, y + 1, x, y);
  }

  // Preference at a vertex: turn right (clockwise on screen), straight, then left.
  /** @type {Map<string, string>} */
  const successor = new Map();
  for (const [id, edge] of edges) {
    const dx = edge.x2 - edge.x1;
    const dy = edge.y2 - edge.y1;
    const candidates = outgoing.get(`${edge.x2},${edge.y2}`) ?? [];
    const wanted = [[-dy, dx], [dx, dy], [dy, -dx]];
    let chosen = '';
    for (const [wx, wy] of wanted) {
      chosen = candidates.find((cid) => {
        const c = /** @type {NonNullable<ReturnType<typeof edges.get>>} */ (edges.get(cid));
        return c.x2 - c.x1 === wx && c.y2 - c.y1 === wy;
      }) ?? '';
      if (chosen !== '') {
        break;
      }
    }
    successor.set(id, chosen);
  }

  const ids = [...edges.keys()].sort((a, b) => {
    const ea = /** @type {NonNullable<ReturnType<typeof edges.get>>} */ (edges.get(a));
    const eb = /** @type {NonNullable<ReturnType<typeof edges.get>>} */ (edges.get(b));
    return ea.y1 - eb.y1 || ea.x1 - eb.x1 || ea.y2 - eb.y2 || ea.x2 - eb.x2;
  });
  const visited = new Set();
  /** @type {XY[][]} */
  const loops = [];
  for (const startId of ids) {
    if (visited.has(startId)) {
      continue;
    }
    /** @type {XY[]} */
    const points = [];
    /** @type {number[][]} */
    const dirs = [];
    let id = startId;
    do {
      visited.add(id);
      const e = /** @type {NonNullable<ReturnType<typeof edges.get>>} */ (edges.get(id));
      points.push([e.x1, e.y1]);
      dirs.push([e.x2 - e.x1, e.y2 - e.y1]);
      id = /** @type {string} */ (successor.get(id));
    } while (id !== startId);

    // Keep vertices where the direction changes. The start vertex is the
    // (y, x)-smallest on its loop, always a corner of a closed rectilinear loop.
    /** @type {XY[]} */
    const loop = [];
    for (let i = 0; i < points.length; i += 1) {
      const before = dirs[(i + dirs.length - 1) % dirs.length];
      if (before[0] !== dirs[i][0] || before[1] !== dirs[i][1]) {
        loop.push(points[i]);
      }
    }
    loops.push(loop);
  }
  return loops;
}
