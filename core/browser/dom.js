// @ts-check
// Safe DOM helpers: text-only content, clipboard and Blob downloads. Everything
// reads browser globals at call time so tests can stub them.

const UNSAFE_URL = /^\s*(?:javascript|data|vbscript):/i;
const FORBIDDEN_ATTRIBUTES = new Set(['style', 'srcdoc', 'innerhtml', 'outerhtml']);
const REVOKE_DELAY_MS = 1000;
const DEFAULT_TOAST_MS = 5000;

/**
 * @typedef {object} ElementProps
 * @property {string} [className]
 * @property {string} [text] Assigned through `textContent`.
 * @property {Record<string, string | number | boolean>} [attrs] Plain attributes; `on*`, `style` and script URLs are refused.
 * @property {Record<string, string>} [dataset]
 * @property {Record<string, (event: Event) => void>} [on] Listeners added with `addEventListener`.
 */

/**
 * Creates an element without ever parsing markup. Children are nodes or text.
 * @param {string} tag
 * @param {ElementProps} [props]
 * @param {...(Node | string | null | undefined)} children
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, ...children) {
  const node = globalThis.document.createElement(tag);
  if (props.className) {
    node.className = props.className;
  }
  if (props.text !== undefined) {
    node.textContent = props.text;
  }
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    const lower = name.toLowerCase();
    if (lower.startsWith('on') || FORBIDDEN_ATTRIBUTES.has(lower)) {
      throw new TypeError(`Attribute "${name}" is not allowed`);
    }
    if ((lower === 'href' || lower === 'src') && UNSAFE_URL.test(String(value))) {
      throw new TypeError(`Unsafe URL in "${name}"`);
    }
    node.setAttribute(name, String(value));
  }
  for (const [name, value] of Object.entries(props.dataset ?? {})) {
    node.dataset[name] = value;
  }
  for (const [type, listener] of Object.entries(props.on ?? {})) {
    node.addEventListener(type, listener);
  }
  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    node.append(typeof child === 'string' ? globalThis.document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Shows a text-only status message in a polite live region and removes it
 * after `durationMs`. Style `.toast-host` / `.toast` / `.toast-<kind>` in CSS.
 * @param {string} message
 * @param {{ kind?: 'info' | 'warning', durationMs?: number }} [o]
 * @returns {HTMLElement}
 */
export function showToast(message, o = {}) {
  const doc = globalThis.document;
  let host = doc.querySelector('.toast-host');
  if (!host) {
    host = el('div', { className: 'toast-host', attrs: { role: 'status', 'aria-live': 'polite' } });
    doc.body.append(host);
  }
  const toast = el('div', { className: `toast toast-${o.kind ?? 'info'}`, text: message });
  host.append(toast);
  globalThis.setTimeout(() => toast.remove(), o.durationMs ?? DEFAULT_TOAST_MS);
  return toast;
}

/**
 * Copies text with the async Clipboard API, falling back to a transient
 * textarea and `execCommand('copy')`. Never throws.
 * @param {string} text
 * @returns {Promise<boolean>} Whether the browser accepted the copy.
 */
export async function copyText(text) {
  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the legacy path.
  }
  const doc = globalThis.document;
  if (!doc?.body || typeof doc.execCommand !== 'function') {
    return false;
  }
  const area = /** @type {HTMLTextAreaElement} */ (el('textarea', { className: 'clipboard-buffer', attrs: { readonly: '', 'aria-hidden': 'true', tabindex: '-1' } }));
  area.value = text;
  doc.body.append(area);
  try {
    area.select();
    return doc.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Makes a file name safe for a download: no path or control characters, no
 * leading dots, and at most 120 characters.
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string}
 */
export function safeFileName(name, fallback = 'puzzle') {
  const cleaned = String(name ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120);
  return cleaned === '' ? fallback : cleaned;
}

/**
 * @param {string} fileName
 * @param {Blob} blob
 */
export function downloadBlob(fileName, blob) {
  const doc = globalThis.document;
  const url = globalThis.URL.createObjectURL(blob);
  const link = el('a', { attrs: { href: url, download: safeFileName(fileName) } });
  try {
    doc.body.append(link);
    link.click();
  } finally {
    link.remove();
    globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}

/**
 * @param {string} fileName
 * @param {string} text
 * @param {string} [mime]
 */
export function downloadText(fileName, text, mime = 'application/json') {
  downloadBlob(fileName, new Blob([text], { type: `${mime};charset=utf-8` }));
}
