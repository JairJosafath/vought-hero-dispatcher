#!/usr/bin/env node
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, join, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const [input, output] = process.argv.slice(2);
if (!input || !output || !['.svg', '.png'].includes(extname(output))) {
  console.error('Usage: node scripts/export-diagram.mjs input.excalidraw output.svg|output.png');
  process.exit(1);
}
const scene = JSON.parse(await readFile(input, 'utf8'));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'vhd-export-'));
let browser;
let server;
try {
  await build({
    stdin: {
      contents: `import { exportToSvg, restoreElements } from '@excalidraw/excalidraw';
        window.renderScene = async (scene) => {
          const svg = await exportToSvg({
            elements: restoreElements(scene.elements, null), files: scene.files ?? {},
            appState: { ...scene.appState, exportBackground: true, exportWithDarkMode: false, exportScale: 1 },
            exportPadding: 30,
          });
          return svg.outerHTML;
        };`,
      resolveDir: root,
    },
    bundle: true, format: 'iife', outfile: join(temporary, 'export.js'),
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.woff2': 'file' }, logLevel: 'silent',
  });
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end('<style>body{margin:0}svg{display:block}</style><script>window.EXCALIDRAW_ASSET_PATH="/assets/"</script><script src="/export.js"></script>');
        return;
      }
      const base = path.startsWith('/assets/') ? join(root, 'node_modules/@excalidraw/excalidraw/dist/prod') : temporary;
      const relative = path.startsWith('/assets/') ? path.slice(8) : path.slice(1);
      const file = resolve(base, relative);
      if (!file.startsWith(base + '/')) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  page.on("console", msg => { if (msg.type() === "error" && !msg.text().startsWith("Failed to use workers for subsetting")) console.error(msg.text()); });
  page.on("requestfailed", req => console.error("Failed asset:", req.url()));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Exports must work with local assets only, and never upload scene data.
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') || route.request().url().startsWith('data:') ? route.continue() : route.abort());
  await page.goto(origin);
  await page.waitForFunction(() => typeof window.renderScene === 'function');
  const svg = await page.evaluate(data => window.renderScene(data), scene);
  if (extname(output) === '.svg') await writeFile(output, svg);
  else {
    // Render the standalone SVG in a fresh page, isolated from editor font faces.
    const preview = await browser.newPage({ deviceScaleFactor: 2 });
    await preview.setContent('<style>body{margin:0}svg{display:block}</style>' + svg);
    await preview.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('text')].map(text => {
        const style = getComputedStyle(text);
        return document.fonts.load(style.fontSize + ' ' + style.fontFamily, text.textContent);
      }));
      await document.fonts.ready;
    });
    await preview.locator('svg').screenshot({ path: output, timeout: 30000 });
  }
  console.log(`Exported ${output}`);
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
  await rm(temporary, { recursive: true, force: true });
}
