// Run with Node and Playwright installed (or NODE_PATH pointing to its bundle).
// Uses only authored EPUB content and local app assets. No external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const JSZip = require('../../pwa-reader/vendor/jszip-3.10.1/jszip.min.js');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'generated/mobile-reader-qa');
const origin = 'http://127.0.0.1:8766';

async function epub(chapters, title) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OPS/book.opf', `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">authored-mobile-qa</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>${chapters.map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
  zip.file('OPS/nav.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="c${i}.xhtml">${c.title}</a></li>`).join('')}</ol></nav></body></html>`);
  chapters.forEach((c, i) => zip.file(`OPS/c${i}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${c.title}</title></head><body>${c.body}</body></html>`));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const prose = Array.from({ length: 100 }, (_, i) => `<p>Section ${i + 1}. The quiet garden welcomes a visitor. We follow the winding path beside the river and watch sunlight move across the water. A small boat rests by the bridge while birds return to their nests.</p>`).join('');

async function installRoutes(page, fixtures) {
  await page.route(origin + '/**', async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
    const file = path.resolve(root, pathname);
    try {
      assert.ok(file.startsWith(root + path.sep));
      const body = fixtures[pathname] || await fs.readFile(file);
      await route.fulfill({ body, contentType: ({ js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', epub: 'application/epub+zip' })[pathname.split('.').pop()] || 'application/octet-stream' });
    } catch (_) { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
}

async function openApp(page) {
  await page.goto(origin + '/pwa-reader/r3.html');
  await page.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
}
async function importFixture(page, name) {
  return page.evaluate(async name => {
    const app = document.querySelector('#r3-root').__r3App;
    const blob = await (await fetch('/qa/' + name + '.epub')).blob();
    await app.controller.importBook(new File([blob], name + '.epub', { type: 'application/epub+zip', lastModified: 1 }));
    const id = app.store.getState().importStatus.lastImportedBookKey;
    await app.controller.selectBook(id);
    return id;
  }, name);
}
async function reader(page) {
  return page.evaluate(() => document.querySelector('#r3-root').__r3App.store.getState().reader);
}
async function savedPosition(page, id) {
  return page.evaluate(async id => (await import('/pwa-reader/storage.js')).getReadingProgress(id), id);
}

async function verifyViewport(browser, viewport, fixtures, label) {
  const page = await browser.newPage({ viewport, hasTouch: label === 'mobile', isMobile: label === 'mobile' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await installRoutes(page, fixtures);
  await openApp(page);
  await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
  const id = await importFixture(page, 'reader');
  assert.equal((await reader(page)).status, 'ready');
  assert.equal((await reader(page)).contentKind, 'media');
  assert.equal(await page.locator('.r3-reader-content img').count(), 1);
  assert.equal(await page.locator('.r3-reader-measure').count(), 0);
  assert.doesNotMatch(await page.locator('#r3-root').innerText(), /without readable text|\{title\}|计算全书|Preparing book pages/);
  await page.screenshot({ path: path.join(output, label + '-cover.png') });
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.selectReaderChapter(1));
  assert.equal((await reader(page)).contentKind, 'empty');
  assert.match(await page.locator('.r3-reader-content').innerText(), /No reading content|没有阅读内容/);
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.selectReaderChapter(2));
  const start = await reader(page);
  assert.ok(start.pagination.pageCount > 4);
  const geometry = () => page.evaluate(() => {
    const scroll = document.querySelector('.r3-reader-scroll'), content = scroll.querySelector('.r3-reader-content');
    const style = getComputedStyle(scroll);
    return { height: content.clientHeight, width: content.clientWidth, top: style.paddingTop, bottom: style.paddingBottom,
      headerHeight: document.querySelector('.r3-reader-header').offsetHeight, footerHeight: document.querySelector('.r3-reader-footer').offsetHeight,
      pages: document.querySelector('#r3-root').__r3App.store.getState().reader.pagination.pageCount };
  });
  const visible = await geometry();
  await page.evaluate(() => {
    window.qaOriginalContent = document.querySelector('.r3-reader-content');
    document.querySelector('#r3-root').__r3App.controller.toggleReaderChrome();
  });
  assert.deepEqual(await geometry(), visible);
  assert.equal(parseFloat(visible.top), 12);
  assert.equal(parseFloat(visible.bottom), 28);
  assert.equal(visible.height, viewport.height - 40);
  assert.ok(visible.height > 0 && visible.width > 0);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.r3-reader-header')).visibility === 'hidden');
  assert.equal(await page.locator('.r3-reader-page-indicator').isVisible(), true);
  assert.equal(await page.evaluate(() => document.querySelector('.r3-reader-content') === window.qaOriginalContent), true);
  await page.screenshot({ path: path.join(output, label + '-immersive.png') });

  if (label === 'mobile') {
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (start, end, verticalFirst = false) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y: 400 }] });
      if (verticalFirst) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - 2, y: 440 }] });
      for (let i = 1; i <= 4; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start + (end - start) * i / 4, y: verticalFirst ? 440 : 402 }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await swipe(300, 160);
    await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().reader.pagination.pageIndex === 1);
    await swipe(100, 240);
    await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().reader.pagination.pageIndex === 0);
    await swipe(12, 180);
    await swipe(280, 140, true);
    assert.equal((await reader(page)).pagination.pageIndex, 0);
    await page.evaluate(() => {
      const node = document.querySelector('.r3-reader-content p').firstChild;
      const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 10);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
    });
    await swipe(300, 160);
    assert.equal((await reader(page)).pagination.pageIndex, 0);
    await page.evaluate(() => document.getSelection().removeAllRanges());
    await cdp.detach();
  }

  // Same-chapter animation keeps the live prose. Durable position changes once,
  // after completion. Cancellation during a rerender must restore exact pixels.
  const turn = await page.evaluate(async () => {
    const root = document.querySelector('#r3-root'), app = root.__r3App;
    const states = []; const off = app.store.subscribe(s => states.push(s.reader.status));
    const initial = document.querySelector('.r3-reader-scroll').scrollLeft;
    const done = root.__readerLayout.turn(1);
    await new Promise(r => setTimeout(r, 65));
    const middle = document.querySelector('.r3-reader-scroll').scrollLeft;
    const during = app.store.getState().reader.pagination.pageIndex;
    await done; off();
    return { initial, middle, during, final: document.querySelector('.r3-reader-scroll').scrollLeft, page: app.store.getState().reader.pagination.pageIndex, states, sameNode: document.querySelector('.r3-reader-content') === window.qaOriginalContent };
  });
  assert.ok(turn.middle > turn.initial && turn.middle < turn.final);
  assert.equal(turn.during, 0); assert.equal(turn.page, 1); assert.equal(turn.sameNode, true);
  assert.ok(turn.states.every(s => s === 'ready'));
  const cancelled = await page.evaluate(async () => {
    const root = document.querySelector('#r3-root'), app = root.__r3App;
    const initial = document.querySelector('.r3-reader-scroll').scrollLeft;
    const done = root.__readerLayout.turn(1);
    await new Promise(r => setTimeout(r, 50));
    app.controller.openReaderContents();
    const success = await done;
    app.controller.closeOverlay();
    return { initial, final: document.querySelector('.r3-reader-scroll').scrollLeft, success, page: app.store.getState().reader.pagination.pageIndex };
  });
  assert.equal(cancelled.success, false); assert.equal(cancelled.page, 1);
  assert.equal(cancelled.initial, cancelled.final);
  const rapid = await page.evaluate(async () => {
    const turn = document.querySelector('#r3-root').__readerLayout.turn;
    return Promise.all([turn(1), turn(1), turn(-1)]);
  });
  assert.deepEqual(rapid, [true, false, false]);
  assert.equal((await reader(page)).pagination.pageIndex, 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => document.querySelector('#r3-root').__readerLayout.turn(1));
  assert.equal((await reader(page)).pagination.pageIndex, 3);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.flushReaderProgress());
  const saved = await savedPosition(page, id);
  assert.ok(saved.logicalPosition.textOffset > 0);
  assert.equal('pageIndex' in saved, false);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().reader.status === 'ready');
  assert.equal((await reader(page)).pagination.pageIndex, 3);
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.flushReaderProgress());
  assert.deepEqual((await savedPosition(page, id)).logicalPosition, saved.logicalPosition);

  // Chapter boundary: next starts at 0; previous returns to the last local page.
  await page.evaluate(async () => {
    const root = document.querySelector('#r3-root');
    root.__readerLayout.seek(99999);
    await root.__readerLayout.turn(1);
  });
  assert.equal((await reader(page)).chapterIndex, 3);
  assert.equal((await reader(page)).pagination.pageIndex, 0);
  assert.equal(await page.evaluate(async () => document.querySelector('#r3-root').__readerLayout.turn(-1)), true);
  const previous = await reader(page);
  assert.equal(previous.chapterIndex, 2);
  assert.equal(previous.pagination.pageIndex, previous.pagination.pageCount - 1);

  // Appearance repaginates only the current chapter. Chrome and theme preserve
  // source progress; language placeholders cannot write a synthetic locator.
  await page.evaluate(async () => {
    const root = document.querySelector('#r3-root'); root.__readerLayout.seek(2);
    await root.__r3App.controller.flushReaderProgress();
  });
  const appearanceAnchor = (await savedPosition(page, id)).logicalPosition;
  const percent = (await reader(page)).pagination.bookProgress;
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.setReaderAppearance({ fontSize: 'xl', margin: 'wide', theme: 'dark' }));
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.flushReaderProgress());
  assert.deepEqual((await savedPosition(page, id)).logicalPosition, appearanceAnchor);
  assert.equal((await reader(page)).pagination.bookProgress, percent);
  await page.screenshot({ path: path.join(output, label + '-dark-wide.png') });
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.setReadingLayout('scroll'));
  assert.ok(await page.locator('.r3-reader-chapter-end-nav').count());
  await page.evaluate(() => document.querySelector("#r3-root").__r3App.controller.openReaderProgress());
  const slider = page.locator('[data-action="reader-progress-page"]');
  assert.equal(await slider.isEnabled(), true);
  await slider.fill("650");
  await page.waitForFunction(() => {
    const state = document.querySelector("#r3-root").__r3App.store.getState();
    return state.reader.status === "ready" && state.reader.pagination.bookProgress > 0.649;
  });
  assert.equal((await reader(page)).chapterIndex, 2);
  await page.evaluate(() => document.querySelector("#r3-root").__r3App.controller.closeOverlay());
  await page.locator('[data-action="reader-next"]').click();
  await page.waitForFunction(() => {
    const reader = document.querySelector('#r3-root').__r3App.store.getState().reader;
    return reader.status === 'ready' && reader.chapterIndex === 3;
  });
  assert.equal((await reader(page)).chapterIndex, 3);
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.setReadingLayout('page'));

  const guide = await page.evaluate(async () => {
    const app = document.querySelector('#r3-root').__r3App;
    const start = performance.now(); await app.controller.openGuide();
    return { ms: performance.now() - start, reader: app.store.getState().reader };
  });
  assert.equal(guide.reader.status, 'ready');
  assert.equal(guide.reader.pagination.status, 'ready');
  assert.equal(await page.locator('.r3-reader-measure').count(), 0);
  await page.evaluate(async () => document.querySelector("#r3-root").__r3App.controller.selectReaderChapter(3));
  assert.ok(await page.locator('.r3-reader-content .vocab-hit').count());
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.setReaderMode('chinese'));
  assert.equal((await reader(page)).effectiveMode, 'chinese');
  await page.evaluate(async () => document.querySelector('#r3-root').__r3App.controller.setReaderMode('cloze-mixed'));
  assert.equal((await reader(page)).effectiveMode, 'cloze-mixed');
  assert.doesNotMatch(await page.locator('#r3-root').innerText(), /\{title\}|计算全书|Preparing book pages/);
  assert.deepEqual(errors, []);
  await page.close();
  return { viewport, geometry: visible, turn, cancelled, guideOpenMs: guide.ms, savedPosition: saved.logicalPosition, checks: 'passed' };
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540"><rect width="360" height="540" fill="#245044"/><circle cx="180" cy="220" r="90" fill="#eecb7e"/></svg>';
  const fixtures = { 'qa/reader.epub': await epub([
    { title: 'Title Page', body: `<img alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>` },
    { title: 'Empty section', body: '<div> </div>' },
    { title: 'Garden', body: '<h1>Garden</h1>' + prose },
    { title: 'River', body: '<h1>River</h1>' + prose }
  ], 'Authored Reader QA') };
  const browser = await chromium.launch({ channel: process.env.READER_QA_CHANNEL || 'msedge', headless: true, args: ['--no-proxy-server'] });
  try {
    const results = {};
    for (const [label, viewport] of [['mobile', { width: 393, height: 852 }], ['desktop', { width: 1365, height: 900 }]]) {
      results[label] = await verifyViewport(browser, viewport, fixtures, label);
    }
    await fs.writeFile(path.join(output, 'browser-qa.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
