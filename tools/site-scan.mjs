// @ts-check
// Shared lexical scanners used by stamp-version.mjs and check-site.mjs. They find
// asset/module references in HTML, JavaScript and CSS while skipping comments,
// ordinary strings, template text and regular expressions.

/**
 * @typedef {'script' | 'link' | 'nav' | 'asset' | 'module' | 'url' | 'css-import' | 'css-url'} RefType
 * @typedef {{ type: RefType, value: string, start: number, end: number, line: number, stamp: boolean }} Reference
 * @typedef {{ line: number, message: string }} ScanProblem
 * @typedef {{ name: string, value: string | null, start: number, end: number }} Attribute
 * @typedef {{ name: string, attrs: Map<string, Attribute>, start: number, line: number }} Tag
 * @typedef {{ refs: Reference[], problems: ScanProblem[], tags: Tag[] }} ScanResult
 * @typedef {{ type: string, value: string, start: number, end: number, simple?: boolean }} Token
 * @typedef {{ type: RefType, start: number, end: number, stamp: boolean }} RawRef
 * @typedef {{ start: number, message: string }} RawProblem
 */

const REGEX_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await',
]);
const STAMPED_LINK_RELS = new Set([
  'stylesheet', 'modulepreload', 'preload', 'prefetch', 'icon', 'apple-touch-icon', 'manifest', 'mask-icon',
]);
const SRC_ATTRIBUTE_TAGS = new Set(['img', 'source', 'iframe', 'audio', 'video', 'track', 'embed', 'input']);
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * @param {string} path
 * @returns {'html' | 'js' | 'css' | null}
 */
export function fileKind(path) {
  const extension = /\.([^./\\]+)$/.exec(path)?.[1].toLowerCase();
  if (extension === 'html' || extension === 'htm' || extension === 'svg') {
    return 'html';
  }
  if (extension === 'js' || extension === 'mjs') {
    return 'js';
  }
  return extension === 'css' ? 'css' : null;
}

/**
 * @param {string} source
 * @returns {(offset: number) => number} 1-based line lookup.
 */
function lineIndex(source) {
  /** @type {number[]} */
  const starts = [0];
  for (let i = source.indexOf('\n'); i >= 0; i = source.indexOf('\n', i + 1)) {
    starts.push(i + 1);
  }
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low + 1;
  };
}

/**
 * Splits JavaScript into tokens. Regular expression literals are told apart from
 * division by the previous token, which is exact for all code except a regex
 * directly after `)` or `}`.
 * @param {string} source
 * @returns {{ tokens: Token[], problems: RawProblem[] }}
 */
export function tokenizeJs(source) {
  /** @type {Token[]} */
  const tokens = [];
  /** @type {RawProblem[]} */
  const problems = [];
  /** @type {Array<'brace' | 'template'>} */
  const stack = [];
  const n = source.length;
  let i = 0;

  const regexAllowed = () => {
    const prev = tokens[tokens.length - 1];
    if (!prev) {
      return true;
    }
    if (prev.type === 'punct') {
      return ![')', ']', '}', '++', '--'].includes(prev.value);
    }
    if (prev.type === 'ident') {
      const before = tokens[tokens.length - 2];
      return REGEX_KEYWORDS.has(prev.value) && !(before?.type === 'punct' && before.value === '.');
    }
    return prev.type === 'template-head' || prev.type === 'template-mid';
  };

  /** @param {boolean} head */
  const readTemplate = (head) => {
    const start = i;
    while (i < n) {
      const ch = source[i];
      if (ch === '\\') {
        i += 2;
      } else if (ch === '`') {
        tokens.push({ type: 'template', value: source.slice(start, i), start, end: i, simple: head });
        i += 1;
        return;
      } else if (ch === '$' && source[i + 1] === '{') {
        tokens.push({
          type: head ? 'template-head' : 'template-mid',
          value: source.slice(start, i),
          start,
          end: i,
        });
        stack.push('template');
        i += 2;
        return;
      } else {
        i += 1;
      }
    }
    problems.push({ start, message: 'unterminated template literal' });
  };

  if (source.startsWith('#!')) {
    const end = source.indexOf('\n');
    i = end < 0 ? n : end;
  }
  while (i < n) {
    const ch = source[i];
    if (/[\s\uFEFF]/.test(ch)) {
      i += 1;
    } else if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end < 0 ? n : end;
    } else if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) {
        problems.push({ start: i, message: 'unterminated block comment' });
      }
      i = end < 0 ? n : end + 2;
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && source[j] !== ch && source[j] !== '\n') {
        j += source[j] === '\\' ? 2 : 1;
      }
      if (source[j] !== ch) {
        problems.push({ start: i, message: 'unterminated string literal' });
      }
      tokens.push({ type: 'string', value: source.slice(i + 1, j), start: i + 1, end: Math.min(j, n) });
      i = j + 1;
    } else if (ch === '`') {
      i += 1;
      readTemplate(true);
    } else if (/[A-Za-z_$#\u0080-\uFFFF]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[\w$\u0080-\uFFFF]/.test(source[j])) {
        j += 1;
      }
      tokens.push({ type: 'ident', value: source.slice(i, j), start: i, end: j });
      i = j;
    } else if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(source[j])) {
        j += 1;
      }
      if (/[eE]$/.test(source.slice(i, j)) && !/^0[xX]/.test(source.slice(i, j)) && /[+-]/.test(source[j] ?? '')) {
        j += 1;
        while (j < n && /[\w]/.test(source[j])) {
          j += 1;
        }
      }
      tokens.push({ type: 'number', value: source.slice(i, j), start: i, end: j });
      i = j;
    } else if (ch === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && source[j] !== '\n' && (inClass || source[j] !== '/')) {
        if (source[j] === '\\') {
          j += 1;
        } else if (source[j] === '[') {
          inClass = true;
        } else if (source[j] === ']') {
          inClass = false;
        }
        j += 1;
      }
      if (source[j] !== '/') {
        problems.push({ start: i, message: 'unterminated regular expression literal' });
      }
      j += 1;
      while (j < n && /[A-Za-z]/.test(source[j])) {
        j += 1;
      }
      tokens.push({ type: 'regex', value: source.slice(i, j), start: i, end: j });
      i = j;
    } else if (ch === '}') {
      i += 1;
      if (stack.pop() === 'template') {
        readTemplate(false);
      } else {
        tokens.push({ type: 'punct', value: '}', start: i - 1, end: i });
      }
    } else {
      const pair = source.slice(i, i + 2);
      const value = pair === '++' || pair === '--' ? pair : ch;
      if (value === '{') {
        stack.push('brace');
      }
      tokens.push({ type: 'punct', value, start: i, end: i + value.length });
      i += value.length;
    }
  }
  return { tokens, problems };
}

/**
 * @param {Token | undefined} token
 * @param {string} value
 */
const isPunct = (token, value) => token?.type === 'punct' && token.value === value;

/**
 * @param {Token | undefined} token
 * @param {string} value
 */
const isIdent = (token, value) => token?.type === 'ident' && token.value === value;

/** @param {Token | undefined} token */
const isLiteral = (token) => token?.type === 'string' || (token?.type === 'template' && token.simple === true);

/**
 * @param {string} source
 * @returns {{ refs: RawRef[], problems: RawProblem[] }}
 */
function scanJsRaw(source) {
  const { tokens, problems } = tokenizeJs(source);
  /** @type {RawRef[]} */
  const refs = [];

  /**
   * @param {RefType} type
   * @param {Token} token
   */
  const addLiteral = (type, token) => {
    if (token.value.includes('\\')) {
      problems.push({ start: token.start, message: `escape sequence in specifier ${token.value}` });
    } else {
      refs.push({ type, start: token.start, end: token.end, stamp: true });
    }
  };

  /**
   * Finds the end of the argument that starts at `from`.
   * @param {number} from
   * @returns {number} Index of the top-level `,` or `)`, or the token count.
   */
  const argumentEnd = (from) => {
    let depth = 0;
    for (let k = from; k < tokens.length; k += 1) {
      const token = tokens[k];
      if (token.type !== 'punct') {
        continue;
      }
      if ('([{'.includes(token.value)) {
        depth += 1;
      } else if (')]}'.includes(token.value)) {
        if (depth === 0) {
          return k;
        }
        depth -= 1;
      } else if (token.value === ',' && depth === 0) {
        return k;
      }
    }
    return tokens.length;
  };

  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k];
    const afterDot = isPunct(tokens[k - 1], '.');
    if (token.type !== 'ident' || afterDot) {
      continue;
    }
    const next = tokens[k + 1];
    if (token.value === 'import') {
      if (next?.type === 'string') {
        addLiteral('module', next);
      } else if (isPunct(next, '(')) {
        if (isLiteral(tokens[k + 2]) && (isPunct(tokens[k + 3], ')') || isPunct(tokens[k + 3], ','))) {
          addLiteral('module', /** @type {Token} */ (tokens[k + 2]));
        } else {
          problems.push({ start: token.start, message: 'dynamic import() with a non-literal specifier' });
        }
      } else if (
        isPunct(next, '.') && isIdent(tokens[k + 2], 'meta') && isPunct(tokens[k + 3], '.') &&
        isIdent(tokens[k + 4], 'resolve') && isPunct(tokens[k + 5], '(')
      ) {
        if (isLiteral(tokens[k + 6]) && (isPunct(tokens[k + 7], ')') || isPunct(tokens[k + 7], ','))) {
          addLiteral('url', /** @type {Token} */ (tokens[k + 6]));
        } else {
          problems.push({ start: token.start, message: 'import.meta.resolve() with a non-literal specifier' });
        }
      }
    } else if (token.value === 'from') {
      if (next?.type === 'string') {
        addLiteral('module', next);
      }
    } else if (token.value === 'importScripts') {
      if (isPunct(next, '(')) {
        problems.push({ start: token.start, message: 'importScripts() is not supported; use module workers' });
      }
    } else if (token.value === 'new') {
      const name = next;
      if (name?.type === 'ident' && isPunct(tokens[k + 2], '(')) {
        const first = k + 3;
        const end = argumentEnd(first);
        const argTokens = tokens.slice(first, end);
        if (name.value === 'URL' && isPunct(tokens[end], ',')) {
          const tail = tokens.slice(end + 1, end + 7);
          if (
            isIdent(tail[0], 'import') && isPunct(tail[1], '.') && isIdent(tail[2], 'meta') &&
            isPunct(tail[3], '.') && isIdent(tail[4], 'url') && (isPunct(tail[5], ')') || isPunct(tail[5], ','))
          ) {
            if (argTokens.length === 1 && isLiteral(argTokens[0])) {
              addLiteral('url', argTokens[0]);
            } else {
              problems.push({ start: token.start, message: 'new URL(..., import.meta.url) with a non-literal path' });
            }
          }
        } else if (/^(?:Shared)?Worker$/.test(name.value) && argTokens.length === 1 && isLiteral(argTokens[0])) {
          problems.push({
            start: token.start,
            message: `${name.value} with a string path; use new URL('./x.js', import.meta.url)`,
          });
        }
      }
    }
  }
  return { refs, problems };
}

/**
 * @param {string} source
 * @param {number} offset
 * @returns {{ refs: RawRef[], problems: RawProblem[] }}
 */
function scanCssRaw(source, offset = 0) {
  /** @type {RawRef[]} */
  const refs = [];
  /** @type {RawProblem[]} */
  const problems = [];
  const n = source.length;
  let importPending = false;
  let i = 0;

  /**
   * @param {number} start Index of the opening quote.
   * @returns {{ start: number, end: number, next: number }}
   */
  const readString = (start) => {
    const quote = source[start];
    let j = start + 1;
    while (j < n && source[j] !== quote && source[j] !== '\n') {
      j += source[j] === '\\' ? 2 : 1;
    }
    return { start: start + 1, end: Math.min(j, n), next: j + 1 };
  };

  /**
   * @param {number} start
   * @param {number} end
   */
  const addUrl = (start, end) => {
    const value = source.slice(start, end);
    if (value.includes('\\')) {
      problems.push({ start: start + offset, message: `escape sequence in url ${value}` });
    } else if (/^(?:var|attr|env|calc)\(/i.test(value) || value.includes('(')) {
      problems.push({ start: start + offset, message: `dynamic url ${value}` });
    } else if (value !== '') {
      refs.push({ type: importPending ? 'css-import' : 'css-url', start: start + offset, end: end + offset, stamp: true });
    }
    importPending = false;
  };

  while (i < n) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : '';
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
    } else if (ch === '"' || ch === "'") {
      const text = readString(i);
      if (importPending) {
        addUrl(text.start, text.end);
      }
      i = text.next;
    } else if (ch === '@' && /^@import(?![\w-])/i.test(source.slice(i, i + 8))) {
      importPending = true;
      i += 7;
    } else if (/^url\(/i.test(source.slice(i, i + 4)) && !/[\w-]/.test(prev)) {
      i += 4;
      while (i < n && /\s/.test(source[i])) {
        i += 1;
      }
      if (source[i] === '"' || source[i] === "'") {
        const text = readString(i);
        addUrl(text.start, text.end);
        i = text.next;
      } else {
        const close = source.indexOf(')', i);
        const end = close < 0 ? n : close;
        const value = source.slice(i, end);
        addUrl(i, i + value.trimEnd().length);
        i = end + 1;
      }
    } else if (/^(?:-webkit-)?(?:image-set|src)\(/i.test(source.slice(i, i + 16)) && !/[\w-]/.test(prev)) {
      problems.push({ start: i + offset, message: 'image-set()/src() references are not supported' });
      i += 4;
    } else {
      if (ch === ';' || ch === '{') {
        importPending = false;
      }
      i += 1;
    }
  }
  return { refs, problems };
}

/**
 * Tokenizes the start tags of an HTML or SVG document.
 * @param {string} source
 * @returns {{ tags: Array<{ name: string, attrs: Map<string, Attribute>, start: number }>,
 *   blocks: Array<{ tagIndex: number, start: number, end: number }> }}
 */
export function parseHtml(source) {
  const tags = [];
  const blocks = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const lt = source.indexOf('<', i);
    if (lt < 0) {
      break;
    }
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    const next = source[lt + 1] ?? '';
    if (next === '!' || next === '?' || next === '/') {
      const end = source.indexOf('>', lt);
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (!/[A-Za-z]/.test(next)) {
      i = lt + 1;
      continue;
    }
    let j = lt + 1;
    while (j < n && /[^\s/>]/.test(source[j])) {
      j += 1;
    }
    const name = source.slice(lt + 1, j).toLowerCase();
    /** @type {Map<string, Attribute>} */
    const attrs = new Map();
    while (j < n) {
      while (j < n && /[\s/]/.test(source[j])) {
        j += 1;
      }
      if (j >= n || source[j] === '>') {
        break;
      }
      const nameStart = j;
      while (j < n && /[^\s/>=]/.test(source[j])) {
        j += 1;
      }
      if (j === nameStart) {
        j += 1;
        continue;
      }
      const attrName = source.slice(nameStart, j).toLowerCase();
      let k = j;
      while (k < n && /\s/.test(source[k])) {
        k += 1;
      }
      /** @type {string | null} */
      let value = null;
      let valueStart = j;
      let valueEnd = j;
      if (source[k] === '=') {
        k += 1;
        while (k < n && /\s/.test(source[k])) {
          k += 1;
        }
        const quote = source[k];
        if (quote === '"' || quote === "'") {
          const close = source.indexOf(quote, k + 1);
          valueStart = k + 1;
          valueEnd = close < 0 ? n : close;
          j = close < 0 ? n : close + 1;
        } else {
          valueStart = k;
          let e = k;
          while (e < n && /[^\s>]/.test(source[e])) {
            e += 1;
          }
          valueEnd = e;
          j = e;
        }
        value = source.slice(valueStart, valueEnd);
      }
      if (!attrs.has(attrName)) {
        attrs.set(attrName, { name: attrName, value, start: valueStart, end: valueEnd });
      }
    }
    tags.push({ name, attrs, start: lt });
    i = Math.min(j + 1, n);
    if (['script', 'style', 'textarea', 'title'].includes(name)) {
      const closer = new RegExp(`</${name}`, 'gi');
      closer.lastIndex = i;
      const found = closer.exec(source);
      const end = found ? found.index : n;
      if (name === 'script' || name === 'style') {
        blocks.push({ tagIndex: tags.length - 1, start: i, end });
      }
      i = end;
    }
  }
  return { tags, blocks };
}

/**
 * @param {string} source
 * @returns {{ refs: RawRef[], problems: RawProblem[], tags: Array<{ name: string, attrs: Map<string, Attribute>, start: number }> }}
 */
function scanHtmlRaw(source) {
  const { tags, blocks } = parseHtml(source);
  /** @type {RawRef[]} */
  const refs = [];
  /** @type {RawProblem[]} */
  const problems = [];

  /**
   * @param {RefType} type
   * @param {Attribute | undefined} attr
   * @param {boolean} stamp
   */
  const add = (type, attr, stamp) => {
    if (attr && attr.value !== null) {
      refs.push({ type, start: attr.start, end: attr.end, stamp });
    }
  };

  for (const tag of tags) {
    const { name, attrs } = tag;
    for (const attrName of ['srcset', 'imagesrcset']) {
      if (attrs.has(attrName)) {
        problems.push({ start: tag.start, message: `<${name} ${attrName}> is not supported` });
      }
    }
    if (name === 'script') {
      add('script', attrs.get('src'), true);
    } else if (name === 'link') {
      const rels = (attrs.get('rel')?.value ?? '').toLowerCase().split(/\s+/);
      add('link', attrs.get('href'), rels.some((rel) => STAMPED_LINK_RELS.has(rel)));
    } else if (name === 'a' || name === 'area') {
      add('nav', attrs.get('href'), false);
    } else if (SRC_ATTRIBUTE_TAGS.has(name)) {
      add('asset', attrs.get('src'), true);
      if (name === 'video') {
        add('asset', attrs.get('poster'), true);
      }
    } else if (name === 'object') {
      add('asset', attrs.get('data'), true);
    } else if (name === 'use' || name === 'image') {
      add('asset', attrs.get('href'), true);
      add('asset', attrs.get('xlink:href'), true);
    }
  }
  for (const block of blocks) {
    const tag = tags[block.tagIndex];
    const content = source.slice(block.start, block.end);
    if (tag.name === 'style') {
      const css = scanCssRaw(content, block.start);
      refs.push(...css.refs);
      problems.push(...css.problems);
    } else if (!tag.attrs.has('src') && /^(?:module|(?:text|application)\/javascript)?$/i.test(tag.attrs.get('type')?.value ?? '')) {
      const js = scanJsRaw(content);
      refs.push(...js.refs.map((ref) => ({ ...ref, start: ref.start + block.start, end: ref.end + block.start })));
      problems.push(...js.problems.map((problem) => ({ ...problem, start: problem.start + block.start })));
    }
  }
  return { refs, problems, tags };
}

/**
 * Finds every asset/module reference in a source file.
 * @param {'html' | 'js' | 'css'} kind
 * @param {string} source
 * @returns {ScanResult}
 */
export function scanSource(kind, source) {
  const lineOf = lineIndex(source);
  /** @type {{ refs: RawRef[], problems: RawProblem[], tags?: Array<{ name: string, attrs: Map<string, Attribute>, start: number }> }} */
  const raw = kind === 'html' ? scanHtmlRaw(source) : kind === 'js' ? scanJsRaw(source) : scanCssRaw(source);
  return {
    refs: raw.refs
      .map((ref) => ({ ...ref, value: source.slice(ref.start, ref.end), line: lineOf(ref.start) }))
      .sort((a, b) => a.start - b.start),
    problems: raw.problems.map((problem) => ({ line: lineOf(problem.start), message: problem.message })),
    tags: (raw.tags ?? []).map((tag) => ({ ...tag, line: lineOf(tag.start) })),
  };
}

/**
 * @param {string} value
 * @param {boolean} [module] True for import/export specifiers, which must start with `./` or `../` to be relative.
 * @returns {'local' | 'external' | 'absolute' | 'bare' | 'relative'}
 */
export function classifyReference(value, module = false) {
  const text = value.trim();
  if (text === '' || text.startsWith('#')) {
    return 'local';
  }
  if (SCHEME.test(text) || text.startsWith('//')) {
    return 'external';
  }
  if (text.startsWith('/')) {
    return 'absolute';
  }
  if (module && !text.startsWith('./') && !text.startsWith('../')) {
    return 'bare';
  }
  return 'relative';
}

/**
 * @param {string} value
 * @returns {{ path: string, query: string, fragment: string }} `query` excludes the `?`; `fragment` includes the `#`.
 */
export function splitReference(value) {
  const hashAt = value.indexOf('#');
  const beforeHash = hashAt < 0 ? value : value.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  return {
    path: queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt),
    query: queryAt < 0 ? '' : beforeHash.slice(queryAt + 1),
    fragment: hashAt < 0 ? '' : value.slice(hashAt),
  };
}

/**
 * @param {string} value
 * @returns {string | null} The `v` query parameter, if any.
 */
export function readVersion(value) {
  for (const part of splitReference(value).query.split(/&(?:amp;)?/)) {
    if (part.startsWith('v=')) {
      return part.slice(2);
    }
  }
  return null;
}

/**
 * Adds or replaces the `v` query parameter, keeping other parameters and the fragment.
 * @param {string} value
 * @param {string} version
 * @returns {string}
 */
export function withVersion(value, version) {
  const { path, query, fragment } = splitReference(value);
  const separator = query.includes('&amp;') ? '&amp;' : '&';
  const kept = query.split(/&(?:amp;)?/).filter((part) => part !== '' && part !== 'v' && !part.startsWith('v='));
  return `${path}?${[...kept, `v=${version}`].join(separator)}${fragment}`;
}
