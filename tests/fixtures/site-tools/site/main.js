// @ts-check
// import './ghost-line-comment.js';
/* import('./ghost-block-comment.js'); new URL('./ghost-block.png', import.meta.url) */
import { helper } from './util.js';
export * from './more.js';
import './side-effect.js';

const text = "import './ghost-string.js'; from './ghost-from.js'";
const template = `from './ghost-template.js' ${helper('${')} done`;
const nested = `${`inner ${helper('x')}`}`;
const pattern = /import '\.\/ghost-regex\.js'/;
const ratio = 10 / 2 / 5;
const lazy = () => import('./lazy.js?debug=1');
const worker = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
const data = new URL('./data.json?rev=2#part', import.meta.url);
const home = new URL('./app/', import.meta.url);
const pack = '#pack=abc';

export { helper, text, template, nested, pattern, ratio, lazy, worker, data, home, pack };
