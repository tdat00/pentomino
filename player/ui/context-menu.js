// @ts-check
// Piece menu: opened with the right mouse button, the Menu key or Shift+F10, or a long press on touch. Arrow keys,
// Home, End and Escape work as in a native menu, and the focus returns to the piece afterwards.

import { el } from '../../core/browser/dom.js';
import { locAttrs } from './i18n-dom.js';

/**
 * @typedef {object} MenuEntry
 * @property {string} id Used as `data-action`.
 * @property {string} label
 * @property {string} icon Decorative glyph.
 * @property {string} [shortcut] Key that does the same, shown at the end of the row.
 * @property {boolean} [disabled]
 * @property {boolean} [danger] Shown in red: the action throws something away.
 * @property {() => void} run
 */

const EDGE_PX = 4;

/**
 * @param {HTMLElement} parent
 */
export function createContextMenu(parent) {
  const doc = parent.ownerDocument;
  const win = /** @type {Window} */ (doc.defaultView);
  const menu = el('div', { className: 'pm-menu', attrs: { role: 'menu', hidden: '', tabindex: -1, ...locAttrs({ 'aria-label': 'ui.pieceMenu' }) } });
  parent.append(menu);
  /** @type {Element | null} */
  let opener = null;
  let open = false;

  /** @returns {HTMLButtonElement[]} */
  const items = () => /** @type {HTMLButtonElement[]} */ ([...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')]);

  /** @param {boolean} [restoreFocus] */
  function close(restoreFocus = true) {
    if (!open) {
      return;
    }
    open = false;
    menu.hidden = true;
    menu.replaceChildren();
    doc.removeEventListener('pointerdown', onOutside, true);
    doc.removeEventListener('scroll', onAway, true);
    win.removeEventListener('resize', onAway);
    win.removeEventListener('blur', onAway);
    const from = opener;
    opener = null;
    if (restoreFocus && from instanceof HTMLElement && from.isConnected) {
      from.focus({ preventScroll: true });
    }
  }

  /** @param {Event} event */
  function onOutside(event) {
    if (!menu.contains(/** @type {Node} */ (event.target))) {
      close(false);
    }
  }

  function onAway() {
    close(false);
  }

  menu.addEventListener('keydown', (event) => {
    const list = items();
    const at = list.indexOf(/** @type {HTMLButtonElement} */ (doc.activeElement));
    /** @type {HTMLButtonElement | undefined} */
    let next;
    switch (/** @type {KeyboardEvent} */ (event).key) {
      case 'ArrowDown':
        next = list[(at + 1) % list.length];
        break;
      case 'ArrowUp':
        next = list[(at <= 0 ? list.length : at) - 1];
        break;
      case 'Home':
        next = list[0];
        break;
      case 'End':
        next = list[list.length - 1];
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  });

  return {
    /**
     * @param {{ x: number, y: number, entries: MenuEntry[], opener?: Element | null }} options Viewport coordinates of the pointer.
     */
    open({ x, y, entries, opener: from = null }) {
      close(false);
      opener = from;
      menu.replaceChildren(...entries.map((entry) => {
        const item = /** @type {HTMLButtonElement} */ (el('button', {
          className: entry.danger === true ? 'pm-menu-item pm-menu-item--danger' : 'pm-menu-item',
          attrs: { type: 'button', role: 'menuitem', tabindex: -1, ...(entry.shortcut === undefined ? {} : { 'aria-keyshortcuts': entry.shortcut }) },
          dataset: { action: entry.id },
          on: {
            click: () => {
              close(true);
              entry.run();
            },
          },
        }, el('span', { className: 'pm-menu-icon', text: entry.icon, attrs: { 'aria-hidden': 'true' } }),
        el('span', { className: 'pm-menu-label', text: entry.label }),
        ...(entry.shortcut === undefined ? [] : [el('kbd', { className: 'pm-menu-key', text: entry.shortcut, attrs: { 'aria-hidden': 'true' } })])));
        item.disabled = entry.disabled === true;
        return item;
      }));
      open = true;
      menu.hidden = false;
      const box = menu.getBoundingClientRect();
      const left = Math.max(EDGE_PX, Math.min(x, win.innerWidth - box.width - EDGE_PX));
      const top = Math.max(EDGE_PX, Math.min(y, win.innerHeight - box.height - EDGE_PX));
      menu.style.setProperty('left', `${left}px`);
      menu.style.setProperty('top', `${top}px`);
      doc.addEventListener('pointerdown', onOutside, true);
      doc.addEventListener('scroll', onAway, true);
      win.addEventListener('resize', onAway);
      win.addEventListener('blur', onAway);
      items()[0]?.focus({ preventScroll: true });
    },
    close,
    destroy() {
      close(false);
      menu.remove();
    },
  };
}
