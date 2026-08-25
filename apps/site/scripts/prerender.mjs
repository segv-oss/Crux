import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { render } from '../dist-ssr/ssr.js';

let index = readFileSync('dist/index.html', 'utf8');
const markup = render();

const cssFile = readdirSync('dist/assets').find((f) => f.endsWith('.css'));
if (cssFile) {
  const css = readFileSync(`dist/assets/${cssFile}`, 'utf8');
  index = index.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`);
  console.log(`inlined ${cssFile} (${(css.length / 1024).toFixed(1)} KB)`);
}

if (index.includes('<div id="root"></div>')) {
  writeFileSync(
    'dist/index.html',
    index.replace('<div id="root"></div>', `<div id="root">${markup}</div>`),
  );
  console.log(`prerendered ${markup.length} chars into dist/index.html`);
} else {
  console.warn('root div not found; prerender skipped');
}
