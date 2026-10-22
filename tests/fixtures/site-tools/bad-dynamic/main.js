// @ts-check
const name = './lazy';
const load = () => import(`${name}.js`);
const worker = new Worker('./worker.js');
const asset = new URL(name, import.meta.url);

export { load, worker, asset };
