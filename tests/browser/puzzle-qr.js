// @ts-check
// Browser regression harness for the local puzzle QR adapter: the five golden matrices, error handling, and the
// row-run SVG path rendered with the white quiet-zone box and measured in millimetres on light, dark and
// high-contrast surroundings. Writes a pass/fail list into the page, data-summary and data-result on <html>
// (running until every case, including the asynchronous ones, has finished). Developer fixture, not deployed.

document.documentElement.dataset.result = 'running';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MM_PER_PX = 25.4 / 96;
const STANDARD_PREFIX = 'https://tdat00.github.io/pentomino/player/#p=';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const THEMES = ['light', 'dark', 'high-contrast'];

const GOLDENS = [
  { name: 'G1', version: 5, modules: 37, hash: '8fd29495b33327d2b34f1c5b0b2554b832bb25d199f12ad21666959a823b0c42', code: '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE' },
  { name: 'G2', version: 5, modules: 37, hash: '6ca966be5185d6731a4631313c86e06a9445ff187995e62a012320cda64efbc4', code: '1D2KTH4A0GXPKPP0VSJR425KR0JJR03GKGJ0N2.1AR9VWV' },
  { name: 'G3', version: 5, modules: 37, hash: 'fcfb568e43da12bdfdeeab914a4bd80ffa91140536ef7ee1db947c9ea40426c6', code: '1DESV14A0GXPKPP0VSJR425KR0EKJ97PGQXMQ.19M0GDB' },
  { name: 'G4', version: 6, modules: 41, hash: 'bd4069185f71651f1481a73f68bffd5e532aa48980edee7131ba953b8e50974e', code: '16YHBRC5PQ0V3528M12FADS1D5515TBQVC9BBY1Y8N835B4XSNGJ9NH.1439213K5' },
  {
    name: 'G5',
    version: 11,
    modules: 61,
    hash: '7cd76340de36049de81dd86e02614cca72abd3eac9672d0160e5daeb90ed05b7',
    code: '1EG2H6A2XE0BZ5TNBYPNFBYQNTVVZF57XNJS67YWYDKZEENH7XSVS3YYTDFKZT7YYTE3YWYEFVS9N3YYC3VDDZ6QXSSSZF73DNQQQXHQFXSHRVZJNYFN0ZTTR5NWKD7XRAJFKYZVKBYYVYTS1ZFA1ZD61TTFMFA3JZKFFKEFSWNQT54VV9ZQ7TPG5ZE28JPP62C5PNNABSE2CX0BYKZ.14ZDJDYJYM30V6MX43A5AWCJY447TZG',
  },
];

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  }
  document.getElementById('stage')?.replaceChildren();
}

/**
 * @param {unknown} cond
 * @param {string} msg
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function equal(a, b, msg) {
  assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} tolerance
 * @param {string} msg
 */
function near(a, b, tolerance, msg) {
  assert(Math.abs(a - b) <= tolerance, `${msg}: expected ${b} ± ${tolerance}, got ${a}`);
}

/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);

/** @param {string} text */
async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} color A computed `rgb(...)`/`rgba(...)` value.
 * @returns {number[]}
 */
const channels = (color) => (/rgba?\(([^)]*)\)/.exec(color)?.[1] ?? '').split(',').map(Number);

/**
 * The adapter's documented rendering: opaque white box, black row-run path shifted by the quiet zone, no stroke.
 * @param {import('../../core/browser/qr.js').PuzzleQrMatrix} qr
 * @param {(rows: Uint8Array[]) => string} qrRowRunPath
 * @param {HTMLElement} parent
 */
function renderQr(qr, qrRowRunPath, parent) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${qr.outerModules} ${qr.outerModules}`);
  svg.setAttribute('width', `${qr.outerMm}mm`);
  svg.setAttribute('height', `${qr.outerMm}mm`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', qr.url);
  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(qr.outerModules));
  background.setAttribute('height', String(qr.outerModules));
  background.setAttribute('fill', '#fff');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('transform', `translate(${qr.quietModules} ${qr.quietModules})`);
  path.setAttribute('d', qrRowRunPath(qr.rows));
  path.setAttribute('fill', '#000');
  svg.append(background, path);
  const surround = document.createElement('div');
  surround.className = 'qr-surround';
  surround.append(svg);
  parent.append(surround);
  return { svg, background, path, surround };
}

try {
  const { QR_MAX_VERSION, makePuzzleQr, qrGeometry, qrRowRunPath } = await import('../../core/browser/qr.js');
  const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));

  /** @param {{ urlPrefix: string, code: string, ec?: 'M' | 'L' }} input */
  const mustMake = (input) => {
    const result = makePuzzleQr(input);
    assert(result.ok, `QR for ${input.code.slice(0, 16)}… failed: ${result.ok ? '' : result.message}`);
    return /** @type {import('../../core/browser/qr.js').PuzzleQrMatrix} */ (result.ok ? result.value : undefined);
  };
  const v40 = mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(3322) });

  for (const golden of GOLDENS) {
    await check(`${golden.name}: exact matrix hash, version and size`, async () => {
      const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code });
      equal(qr.version, golden.version, 'version');
      equal(qr.modules, golden.modules, 'modules');
      equal(qr.ec, 'M', 'error correction');
      equal(qr.url, STANDARD_PREFIX + golden.code, 'url');
      equal(await sha256(qr.rows.map((row) => row.join('')).join('\n')), golden.hash, 'matrix SHA-256');
    });
  }

  await check('input errors and capacity are reported, not thrown', () => {
    const code = GOLDENS[0].code;
    for (const input of [
      { urlPrefix: STANDARD_PREFIX, code: code.toLowerCase() },
      { urlPrefix: STANDARD_PREFIX, code: '' },
      { urlPrefix: STANDARD_PREFIX, code: '1D0J.18V3.WE' },
      { urlPrefix: 'https://tdat00.github.io/pentomino/player/', code },
      { urlPrefix: STANDARD_PREFIX, code, ec: 'Q' },
    ]) {
      const result = makePuzzleQr(/** @type {any} */ (input));
      assert(!result.ok && result.code === 'qr-invalid-input', `invalid: ${JSON.stringify(input).slice(0, 80)}`);
    }
    const tooLong = makePuzzleQr({ urlPrefix: STANDARD_PREFIX, code: symbols(3323) });
    assert(!tooLong.ok && tooLong.code === 'qr-too-long', 'one symbol past version 40 at M');
    const lowFits = makePuzzleQr({ urlPrefix: STANDARD_PREFIX, code: symbols(3323), ec: 'L' });
    assert(lowFits.ok && lowFits.value.ec === 'L', 'the same payload still fits at L');
  });

  await check('physical dimensions follow the formula for every version', () => {
    for (let version = 1; version <= QR_MAX_VERSION; version += 1) {
      const g = qrGeometry(version);
      const outer = 17 + 4 * version + 8;
      equal(g.outerModules, outer, `version ${version} outer modules`);
      equal(g.outerMm, Math.max(25, outer * 0.5), `version ${version} outer mm`);
      assert(g.moduleMm >= 0.5 && g.outerMm >= 25, `version ${version} minimums`);
    }
    equal(v40.version, 40, 'largest sample is version 40');
    equal(v40.outerMm, 92.5, 'version 40 box');
  });

  for (const theme of THEMES) {
    await check(`${theme} surroundings: white box, black modules, real millimetres`, () => {
      document.documentElement.dataset.theme = theme;
      const background = channels(getComputedStyle(document.body).backgroundColor);
      const dark = (background[0] + background[1] + background[2]) / 3 < 80;
      equal(dark, theme !== 'light', 'the surroundings follow the theme');
      for (const qr of [
        mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[0].code }),
        mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[4].code }),
        v40,
      ]) {
        const { svg, background: box, path, surround } = renderQr(qr, qrRowRunPath, stage);
        const surroundColor = channels(getComputedStyle(surround).backgroundColor);
        equal((surroundColor[0] + surroundColor[1] + surroundColor[2]) / 3 < 80, theme !== 'light', 'the box around the symbol follows the theme');
        const boxStyle = getComputedStyle(box);
        const pathStyle = getComputedStyle(path);
        equal(boxStyle.fill, 'rgb(255, 255, 255)', `version ${qr.version} quiet-zone fill`);
        equal(pathStyle.fill, 'rgb(0, 0, 0)', `version ${qr.version} module fill`);
        equal(pathStyle.stroke, 'none', `version ${qr.version} stroke`);
        equal(boxStyle.opacity, '1', `version ${qr.version} quiet-zone opacity`);
        equal(pathStyle.opacity, '1', `version ${qr.version} module opacity`);

        const outer = svg.getBoundingClientRect();
        const data = path.getBoundingClientRect();
        near(outer.width * MM_PER_PX, qr.outerMm, 0.02, `version ${qr.version} width in mm`);
        near(outer.height * MM_PER_PX, qr.outerMm, 0.02, `version ${qr.version} height in mm`);
        assert(qr.outerMm >= 25 - 1e-9, `version ${qr.version} box is at least 25 mm`);
        near(data.width * MM_PER_PX, qr.modules * qr.moduleMm, 0.02, `version ${qr.version} symbol width`);
        near(data.height * MM_PER_PX, qr.modules * qr.moduleMm, 0.02, `version ${qr.version} symbol height`);
        assert((data.width * MM_PER_PX) / qr.modules >= 0.5 - 0.001, `version ${qr.version} module is at least 0.5 mm`);
        const quietMm = qr.quietModules * qr.moduleMm;
        near((data.left - outer.left) * MM_PER_PX, quietMm, 0.02, `version ${qr.version} left quiet zone`);
        near((data.top - outer.top) * MM_PER_PX, quietMm, 0.02, `version ${qr.version} top quiet zone`);
        near((outer.right - data.right) * MM_PER_PX, quietMm, 0.02, `version ${qr.version} right quiet zone`);
        near((outer.bottom - data.bottom) * MM_PER_PX, quietMm, 0.02, `version ${qr.version} bottom quiet zone`);
      }
      stage.replaceChildren();
    });
  }
  delete document.documentElement.dataset.theme;

  await check('the painted path covers exactly the matrix modules (isPointInFill)', () => {
    for (const qr of [mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[3].code }), mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[4].code }), v40]) {
      const { path } = renderQr(qr, qrRowRunPath, stage);
      const geometry = /** @type {SVGGeometryElement} */ (/** @type {unknown} */ (path));
      let wrong = 0;
      for (let y = 0; y < qr.modules; y += 1) {
        for (let x = 0; x < qr.modules; x += 1) {
          if (geometry.isPointInFill(new DOMPoint(x + 0.5, y + 0.5)) !== (qr.rows[y][x] === 1)) {
            wrong += 1;
          }
        }
      }
      equal(wrong, 0, `version ${qr.version} modules painted differently from the matrix`);
    }
  });

  await check('the serialized SVG rasterizes to the matrix on a white quiet zone', async () => {
    for (const qr of [mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[0].code }), mustMake({ urlPrefix: STANDARD_PREFIX, code: GOLDENS[4].code })]) {
      const { svg } = renderQr(qr, qrRowRunPath, stage);
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      await image.decode();
      const scale = 8;
      const side = qr.outerModules * scale;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      context.drawImage(image, 0, 0, side, side);
      let wrong = 0;
      for (let y = 0; y < qr.outerModules; y += 1) {
        for (let x = 0; x < qr.outerModules; x += 1) {
          const [r, g, b, a] = context.getImageData(x * scale + scale / 2, y * scale + scale / 2, 1, 1).data;
          const inside = x >= qr.quietModules && y >= qr.quietModules && x < qr.quietModules + qr.modules && y < qr.quietModules + qr.modules;
          const black = inside && qr.rows[y - qr.quietModules][x - qr.quietModules] === 1;
          const expected = black ? 0 : 255;
          if (a !== 255 || Math.abs(r - expected) > 8 || Math.abs(g - expected) > 8 || Math.abs(b - expected) > 8) {
            wrong += 1;
          }
        }
      }
      equal(wrong, 0, `version ${qr.version} pixels that differ from the matrix or are not opaque`);
    }
  });

  await check('no content-security-policy violations or uncaught errors', () => {
    equal(violations.length, 0, `violations: ${violations.join('; ')}`);
    equal(uncaught.length, 0, `uncaught: ${uncaught.join('; ')}`);
  });

  // Left on the page for a human reading a screenshot; the cases above have already measured the same rendering.
  for (const golden of [GOLDENS[0], GOLDENS[4]]) {
    renderQr(mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code }), qrRowRunPath, stage);
  }
} catch (error) {
  results.push({ name: 'harness setup', ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
}

const failed = results.filter((r) => !r.ok);
const list = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.error ? ` — ${r.error}` : ''}`;
  list?.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed`;
}
document.documentElement.dataset.summary = JSON.stringify({ total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 700)) });
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
