import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

test('Service Worker Test Suite', async (t) => {
  const pwaDir = path.join(ROOT_DIR, 'pwa-reader');
  const swPath = path.join(pwaDir, 'sw.js');
  const appJsPath = path.join(pwaDir, 'app.js');
  const indexHtmlPath = path.join(pwaDir, 'index.html');
  
  await t.test('sw.js file exists', async () => {
    await assert.doesNotReject(fs.access(swPath), 'sw.js should exist');
  });

  await t.test('Registration exists and points to ./sw.js', async () => {
    const appJs = await fs.readFile(appJsPath, 'utf8');
    assert.ok(appJs.includes('navigator.serviceWorker.register("./sw.js")'), 'app.js should register ./sw.js');
  });

  await t.test('apple-touch-icon is defined in index.html', async () => {
    const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
    assert.ok(indexHtml.includes('rel="apple-touch-icon"'), 'index.html should have apple-touch-icon');
    const match = indexHtml.match(/<link rel="apple-touch-icon" href="([^"]+)">/);
    assert.ok(match, 'apple-touch-icon should be found');
    
    // Check file exists
    const iconPath = path.join(pwaDir, match[1]);
    await assert.doesNotReject(fs.access(iconPath), 'apple-touch-icon file should exist');
  });

  await t.test('Precache assets list is valid and contains no forbidden assets', async () => {
    const swJs = await fs.readFile(swPath, 'utf8');
    
    // Extract PRECACHE_ASSETS array
    const match = swJs.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);
    assert.ok(match, 'PRECACHE_ASSETS should be defined in sw.js');
    
    const assetsString = match[1];
    const assets = assetsString.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    
    for (const asset of assets) {
      // 7. No cross-origin URL is precached
      assert.ok(!asset.startsWith('http'), `Asset ${asset} should not be an absolute URL`);
      
      // 8. No EPUB, book Blob, IndexedDB or user-profile content is listed
      assert.ok(!asset.endsWith('.epub'), `Asset ${asset} should not be an EPUB file`);
      assert.ok(!asset.includes('blob:'), `Asset ${asset} should not be a blob URL`);
      assert.ok(!asset.includes('indexeddb'), `Asset ${asset} should not reference IndexedDB`);
      assert.ok(!asset.includes('user-profile'), `Asset ${asset} should not reference user profile`);

      // 4. Every explicit precache asset resolves to a real tracked file
      if (asset.endsWith('/')) continue; // Skip directory roots
      
      const assetPath = path.join(pwaDir, asset);
      await assert.doesNotReject(fs.access(assetPath), `Precached asset ${asset} should exist locally`);
    }

    // 5. Vendor runtime files are included
    assert.ok(assets.includes('./vendor/jszip-3.10.1/jszip.min.js'), 'JSZip should be precached');
    assert.ok(assets.includes('./vendor/epubjs-0.3.93/epub.min.js'), 'epub.js should be precached');

    // 6. Required manifest/icons/local JSON files are included
    assert.ok(assets.includes('./manifest.webmanifest'), 'Manifest should be precached');
    assert.ok(assets.includes('../data/vocabulary.json'), 'vocabulary.json should be precached');
    assert.ok(assets.some(a => a.includes('icon-192.png')), 'Icon should be precached');
  });

  await t.test('Fetch handling is restricted to safe methods/origins/scope', async () => {
    const swJs = await fs.readFile(swPath, 'utf8');
    assert.ok(swJs.includes("request.method !== 'GET'"), 'Should ignore non-GET requests');
    assert.ok(swJs.includes("url.origin !== location.origin") || swJs.includes("url.origin !== self.location.origin"), 'Should ignore cross-origin requests');
  });

  await t.test('Activation cleanup restricted to Interleaf cache prefix', async () => {
    const swJs = await fs.readFile(swPath, 'utf8');
    assert.ok(swJs.includes('cacheName.startsWith(CACHE_PREFIX)'), 'Should check cache prefix before deletion');
    assert.ok(swJs.includes("const CACHE_PREFIX = 'interleaf-reader-static-'"), 'Cache prefix should be defined');
  });

  await t.test('Navigation has offline app-shell fallback', async () => {
    const swJs = await fs.readFile(swPath, 'utf8');
    assert.ok(swJs.includes("request.mode === 'navigate'"), 'Should handle navigate requests');
    assert.ok(swJs.includes("caches.match('./index.html')"), 'Should fallback to index.html');
  });
});
