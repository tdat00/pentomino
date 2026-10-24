// @ts-check
// Keyboard shortcuts of the player. One document-level listener maps keys to
// play-controller actions and calls `preventDefault` only for keys it handled.
// Shortcuts stay quiet inside text fields, menus and dialogs.

import { t } from '../i18n.js';

/** @typedef {import('../play.js').createPlayController} CreatePlay */
/** @typedef {ReturnType<CreatePlay>} Play */

/** Ids of the shortcut list in the language packs (`keys.<id>.key` and `keys.<id>.action`); mirrors the handler below. */
const SHORTCUT_IDS = Object.freeze(['tab', 'enter', 'arrows', 'rotate', 'mirror', 'delete', 'escape', 'undo', 'redo', 'help', 'menu', 'assist']);

/**
 * @returns {readonly (readonly [string, string])[]} Key and action text of the help dialog, in the current language.
 */
export function shortcutList() {
  return SHORTCUT_IDS.map((id) => /** @type {const} */ ([t(`keys.${id}.key`), t(`keys.${id}.action`)]));
}

const IGNORED = 'input, textarea, select, [contenteditable="true"], dialog, [role="dialog"], [role="menu"]';
const NATIVE_ACTIVATION = 'button, a, summary, select, input';
const PIECE = '[data-movable="true"], .tray-piece';

/** @type {Readonly<Record<string, 'cw' | 'ccw' | 'flipH' | 'flipV'>>} */
const TRANSFORMS = Object.freeze({
  e: 'cw', r: 'cw', q: 'ccw', f: 'flipH', v: 'flipV',
});

/**
 * @param {EventTarget | null} target
 * @returns {Element | null}
 */
function asElement(target) {
  return target !== null && typeof (/** @type {Element} */ (target)).closest === 'function' ? /** @type {Element} */ (target) : null;
}

/**
 * @param {{ target: EventTarget, play: Play, showHelp: () => void }} options
 * @returns {{ destroy: () => void, handle: (event: KeyboardEvent) => boolean }}
 */
export function createKeyboard({ target, play, showHelp }) {
  /**
   * @param {KeyboardEvent} event
   * @returns {boolean} Whether the key was handled (and its default prevented).
   */
  function handle(event) {
    if (event.defaultPrevented || event.isComposing || event.altKey) {
      return false;
    }
    const origin = asElement(event.target);
    if (origin?.closest(IGNORED) != null) {
      return false;
    }
    const { key } = event;
    const mod = event.ctrlKey || event.metaKey;
    /** @type {boolean} */
    let handled = false;
    if (mod) {
      const lower = key.toLowerCase();
      if (lower === 'z') {
        if (event.shiftKey) {
          play.redo();
        } else {
          play.undo();
        }
        handled = true;
      } else if (lower === 'y' && event.ctrlKey) {
        play.redo();
        handled = true;
      }
    } else {
      // A focused piece becomes the selected one before a key acts on it.
      const focused = origin?.closest(PIECE);
      const focusedId = focused?.getAttribute('data-piece-id') ?? null;
      const withFocus = () => {
        if (focusedId !== null) {
          play.select(focusedId);
        }
      };
      const lower = key.length === 1 ? key.toLowerCase() : key;
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
        withFocus();
        handled = play.moveKey(key, event.shiftKey);
      } else if (Object.hasOwn(TRANSFORMS, lower)) {
        withFocus();
        handled = play.transform(TRANSFORMS[lower]);
      } else if (key === 'Delete' || key === 'Backspace') {
        withFocus();
        handled = play.returnToTray();
      } else if (key === 'Escape') {
        handled = play.cancel();
      } else if (key === '?') {
        showHelp();
        handled = true;
      } else if ((key === 'Enter' || key === ' ') && origin?.closest(NATIVE_ACTIVATION) == null) {
        handled = play.activateSelected();
      }
    }
    if (handled) {
      event.preventDefault();
    }
    return handled;
  }

  /** @param {Event} event */
  const onKeyDown = (event) => {
    handle(/** @type {KeyboardEvent} */ (event));
  };
  target.addEventListener('keydown', onKeyDown);
  return {
    handle,
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
    },
  };
}
