// @ts-check

/**
 * Builds the Generator URL, carrying the query string and hash across.
 * @param {string | URL} moduleUrl URL of the module living next to the root index.html.
 * @param {string} [search]
 * @param {string} [hash]
 * @returns {string}
 */
export function buildRedirectTarget(moduleUrl, search = '', hash = '') {
  const target = new URL('./generator/', moduleUrl);
  target.search = search;
  target.hash = hash;
  return target.href;
}

if (typeof location !== 'undefined') {
  location.replace(buildRedirectTarget(import.meta.url, location.search, location.hash));
}
