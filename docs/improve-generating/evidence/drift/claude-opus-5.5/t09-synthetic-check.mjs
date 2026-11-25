function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function faster(byCell, reps, R, seed) {
  const cells = Object.keys(byCell); const logs = [];
  for (const c of cells) for (const v of byCell[c]) logs.push(Math.log(v));
  const geo = Math.exp(logs.reduce((s, x) => s + x, 0) / logs.length);
  const rand = mulberry32(seed); const vals = [];
  for (let k = 0; k < R; k++) { const idx = reps.map(() => Math.floor(rand() * reps.length)); let s = 0, n = 0; for (const c of cells) for (const i of idx) { s += Math.log(byCell[c][i]); n++; } vals.push(Math.exp(s / n)); }
  vals.sort((x, y) => x - y); const lower = vals[Math.ceil(0.1 * R) - 1];
  const cg = Object.fromEntries(cells.map((c) => [c, Math.exp(byCell[c].reduce((s, v) => s + Math.log(v), 0) / byCell[c].length)]));
  return { geo, lower, cg };
}
const reps = Array.from({ length: 20 }, (_, i) => i);
const a = reps.map(() => 1.5);
const b5 = reps.map((r) => (r <= 4 ? 45000 / 120000 : 1.5));
console.log('15 matched (b reps 0-4 failed):', JSON.stringify(faster({ a, b: b5 }, reps, 1000, 7)));
const b6 = reps.map((r) => (r <= 5 ? 45000 / 120000 : 1.5));
console.log('14 matched (b reps 0-5 failed):', JSON.stringify(faster({ a, b: b6 }, reps, 1000, 7)));
console.log('defaults:', JSON.stringify(faster({ a, b: a }, reps, 1000, 7)));
console.log('T09a faster 2s:', JSON.stringify(faster({ a: [2, 2, 2, 2], b: [2, 2, 2, 2] }, [0, 1, 2, 3], 1000, 7)));
console.log('T09a faster b 0.5:', JSON.stringify(faster({ a: [2, 2, 2, 2], b: [0.5, 0.5, 0.5, 0.5] }, [0, 1, 2, 3], 1000, 7)));
const r1 = reps.map(() => 1.0), r08 = reps.map(() => 0.8);
console.log('noreg 1.0:', JSON.stringify(faster({ x: r1 }, reps, 1000, 7)), 'noreg 0.8:', JSON.stringify(faster({ x: r08 }, reps, 1000, 7)));
const m1 = mulberry32(7), m2 = mulberry32(7); console.log('mulberry', [m1(), m1(), m1()].join(','), [m2(), m2(), m2()].join(','));
