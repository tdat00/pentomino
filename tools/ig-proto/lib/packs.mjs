// @ts-check
// The pack file of a generation item (task pack v4, V4-T04b; review RV2-02): its folder is prepared before the pool
// starts, an existing pack is refused, and a pack is written and hashed only after a successful batch.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** @param {string} packPath The pack file of an unstarted item: an existing file throws, else its folder is created. */
export function preparePackPath(packPath) {
  if (existsSync(packPath)) {
    throw new Error(`unexpected existing pack ${packPath}`);
  }
  mkdirSync(dirname(packPath), { recursive: true });
}

/**
 * @param {string} packPath
 * @param {unknown} pack
 * @returns {string} The SHA-256 of the pack's text, checked against the file read back (a difference throws).
 */
export function writePackFile(packPath, pack) {
  const text = JSON.stringify(pack);
  const hash = createHash('sha256').update(text).digest('hex');
  writeFileSync(packPath, text, { flag: 'wx' });
  if (createHash('sha256').update(readFileSync(packPath)).digest('hex') !== hash) {
    throw new Error('pack write mismatch');
  }
  return hash;
}
