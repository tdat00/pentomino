// D21-V3 preload (MP09d2; cross-review TP03): the D21 observer (../d21-2026-11-12/register.mjs) plus a load hook that
// sets the RES-15a stall limit to 16 in memory, for the certification reruns at N = 16 (the product's 12 needs no
// hook). No product file is changed. Use: node --import <this file> <driver> ...
import '../d21-2026-11-12/register.mjs';
import { registerHooks } from 'node:module';

const FROM = 'const STALL_LIMIT = 12;';

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (source.split(FROM).length !== 2) {
      throw new Error('D21-V3 hook: the STALL_LIMIT line was not found exactly once');
    }
    return { ...result, source: source.replace(FROM, 'const STALL_LIMIT = 16;') };
  },
});
