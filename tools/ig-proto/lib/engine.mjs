// @ts-check
// Loads the modules of one tree (a patched copy of the source) by file URL. Module identity stays inside the copy.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENGINE_MODULES = Object.freeze([
  'board', 'carve', 'clues', 'deduce', 'difficulty', 'generate', 'hash', 'keys', 'levels', 'policy', 'rng', 'tiling',
  'workspace',
]);

/**
 * @typedef {Record<string, any> & { root: string }} Engine
 *   `root` plus one namespace per module: board, carve, clues, deduce, difficulty, generate, hash, keys, levels, policy,
 *   rng, tiling, workspace, calibrationReference, report and runner.
 */

/**
 * @param {string} treeRoot Absolute path of a tree.
 * @returns {Promise<Engine>}
 */
export async function loadEngine(treeRoot) {
  /** @type {Engine} */
  const engine = { root: treeRoot };
  const url = (/** @type {string[]} */ ...parts) => pathToFileURL(join(treeRoot, ...parts)).href;
  for (const name of ENGINE_MODULES) {
    engine[name] = await import(url('core', 'engine', `${name}.js`));
  }
  engine.calibrationReference = await import(url('tools', 'bench', 'calibration-reference.js'));
  engine.report = await import(url('tools', 'bench', 'report.js'));
  engine.runner = await import(url('tools', 'bench', 'runner.js'));
  return engine;
}
