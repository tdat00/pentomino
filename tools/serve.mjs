// @ts-check
import { createServer } from 'node:http';
import { createReadStream, promises as fsp } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_PREFIX = '/pentomino/';
const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '127.0.0.1';

export const MIME_TYPES = Object.freeze({
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
});

/**
 * @param {string} filePath
 * @returns {string}
 */
export function contentTypeFor(filePath) {
  const extension = extname(filePath).toLowerCase();
  return Object.hasOwn(MIME_TYPES, extension)
    ? MIME_TYPES[/** @type {keyof typeof MIME_TYPES} */ (extension)]
    : 'application/octet-stream';
}

/**
 * @param {string} prefix
 * @returns {string}
 */
function normalizePrefix(prefix) {
  let result = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (!result.endsWith('/')) {
    result += '/';
  }
  return result;
}

/**
 * Windows resolves trailing dots/spaces and 8.3 short names to the same entry.
 * @param {string[]} parts
 * @returns {boolean}
 */
function isDenied(parts) {
  const names = parts.map((part) => part.toLowerCase().replace(/[. ]+$/, ''));
  if (parts.some((part) => /~\d/.test(part))) {
    return true;
  }
  if (names.some((name) => name === '.git')) {
    return true;
  }
  return names[0] === 'docs' && names[1] === 'local';
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} method
 * @param {number} status
 * @param {string} message
 * @param {Record<string, string>} [headers]
 */
function sendText(res, method, status, message, headers = {}) {
  const body = Buffer.from(`${message}\n`, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(method === 'HEAD' ? undefined : body);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} method
 * @param {string} location
 */
function redirect(res, method, location) {
  sendText(res, method, 302, `Redirecting to ${location}`, { Location: location });
}

/**
 * @param {{ root?: string, prefix?: string }} [options]
 * @returns {import('node:http').Server}
 */
export function createStaticServer({ root = process.cwd(), prefix = DEFAULT_PREFIX } = {}) {
  const rootDir = resolve(root);
  const urlPrefix = normalizePrefix(prefix);

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function handle(req, res) {
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      sendText(res, method, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    const rawUrl = req.url ?? '/';
    const queryAt = rawUrl.indexOf('?');
    const rawPath = queryAt < 0 ? rawUrl : rawUrl.slice(0, queryAt);
    const search = queryAt < 0 ? '' : rawUrl.slice(queryAt);
    if (!rawPath.startsWith('/')) {
      sendText(res, method, 400, 'Bad Request');
      return;
    }

    let decoded;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {
      sendText(res, method, 400, 'Bad Request');
      return;
    }
    if (decoded.includes('\0') || decoded.includes('\\')) {
      sendText(res, method, 400, 'Bad Request');
      return;
    }

    if (urlPrefix !== '/' && (decoded === '/' || `${decoded}/` === urlPrefix)) {
      redirect(res, method, urlPrefix + search);
      return;
    }
    if (!decoded.startsWith(urlPrefix)) {
      sendText(res, method, 404, 'Not Found');
      return;
    }

    const parts = decoded.slice(urlPrefix.length).split('/').filter((part) => part !== '');
    if (parts.some((part) => part === '.' || part === '..' || part.includes(':'))) {
      sendText(res, method, 400, 'Bad Request');
      return;
    }
    if (isDenied(parts)) {
      sendText(res, method, 403, 'Forbidden');
      return;
    }

    const target = join(rootDir, ...parts);
    if (target !== rootDir && !target.startsWith(rootDir + sep)) {
      sendText(res, method, 400, 'Bad Request');
      return;
    }

    let filePath = target;
    try {
      let info = await fsp.stat(filePath);
      if (info.isDirectory()) {
        if (!decoded.endsWith('/')) {
          redirect(res, method, `${rawPath}/${search}`);
          return;
        }
        filePath = join(filePath, 'index.html');
        info = await fsp.stat(filePath);
      }
      if (!info.isFile()) {
        throw new Error('not a file');
      }
      const realRoot = await fsp.realpath(rootDir);
      const realFile = await fsp.realpath(filePath);
      if (!realFile.startsWith(realRoot + sep)) {
        sendText(res, method, 403, 'Forbidden');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Content-Length': info.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(realFile);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch {
      sendText(res, method, 404, 'Not Found');
    }
  }

  return createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        sendText(res, req.method ?? 'GET', 500, 'Internal Server Error');
      } else {
        res.destroy();
      }
    });
  });
}

/**
 * @param {string[]} argv
 * @returns {{ root: string, port: number, host: string, prefix: string }}
 */
export function parseArgs(argv) {
  const options = { root: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_HOST, prefix: DEFAULT_PREFIX };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) {
      throw new Error(`Missing value for ${flag}`);
    }
    if (flag === '--root') {
      options.root = value;
    } else if (flag === '--host') {
      options.host = value;
    } else if (flag === '--prefix') {
      options.prefix = normalizePrefix(value);
    } else if (flag === '--port') {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error(`Invalid port: ${value}`);
      }
      options.port = port;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { root, port, host, prefix } = parseArgs(process.argv.slice(2));
    const server = createStaticServer({ root, prefix });
    server.listen(port, host, () => {
      const address = /** @type {import('node:net').AddressInfo} */ (server.address());
      console.log(`Serving ${resolve(root)} at http://${host}:${address.port}${prefix}`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: node tools/serve.mjs [--root DIR] [--port N] [--prefix /path/] [--host ADDR]');
    process.exitCode = 2;
  }
}
