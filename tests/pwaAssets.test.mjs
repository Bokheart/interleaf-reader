import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

test('pwaAssets - index.html references local vendored scripts without jsDelivr', async () => {
  const indexHtmlPath = path.join(ROOT_DIR, 'pwa-reader', 'index.html');
  const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');

  assert.ok(!indexHtml.includes('cdn.jsdelivr.net'), 'index.html should not contain cdn.jsdelivr.net references');
  assert.ok(indexHtml.includes('src="./vendor/jszip-3.10.1/jszip.min.js"'), 'index.html should reference local JSZip');
  assert.ok(indexHtml.includes('src="./vendor/epubjs-0.3.93/epub.min.js"'), 'index.html should reference local epub.js');
});

test('pwaAssets - vendored files and licenses exist', async () => {
  const vendorDir = path.join(ROOT_DIR, 'pwa-reader', 'vendor');
  
  const jszipFile = path.join(vendorDir, 'jszip-3.10.1', 'jszip.min.js');
  const jszipLicense = path.join(vendorDir, 'jszip-3.10.1', 'LICENSE.markdown');
  const epubjsFile = path.join(vendorDir, 'epubjs-0.3.93', 'epub.min.js');
  const epubjsLicense = path.join(vendorDir, 'epubjs-0.3.93', 'LICENSE');
  const readme = path.join(vendorDir, 'README.md');

  await assert.doesNotReject(fs.access(jszipFile));
  await assert.doesNotReject(fs.access(jszipLicense));
  await assert.doesNotReject(fs.access(epubjsFile));
  await assert.doesNotReject(fs.access(epubjsLicense));
  await assert.doesNotReject(fs.access(readme));
});

test('pwaAssets - manifest and icons exist', async () => {
  const pwaDir = path.join(ROOT_DIR, 'pwa-reader');
  
  const manifestPath = path.join(pwaDir, 'manifest.webmanifest');
  await assert.doesNotReject(fs.access(manifestPath));
  
  const manifestJson = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  for (const icon of manifestJson.icons) {
    const iconPath = path.join(pwaDir, icon.src);
    await assert.doesNotReject(fs.access(iconPath), `Icon ${icon.src} should exist locally`);
  }
});
