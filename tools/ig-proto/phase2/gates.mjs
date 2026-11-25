// @ts-check
// The stage gates (P2-13b). This stub only keeps `run-group` from passing group 1's smoke gate before P2-13b exists.

/** @returns {{ ok: boolean, problems: string[] }} Always a failure. */
export function smokeGate() {
  return { ok: false, problems: ['smoke gate not implemented (P2-13b)'] };
}
