// @ts-check
import { APP_VERSION } from '../core/engine/version.js';

const versionLabel = document.querySelector('[data-app-version]');
if (versionLabel) {
  versionLabel.textContent = APP_VERSION;
}
