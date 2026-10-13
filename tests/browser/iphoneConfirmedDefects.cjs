// Authored fixtures only. NODE_PATH=<installed packages> node tests/browser/iphoneConfirmedDefects.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const JSZip = require('../../pwa-reader/vendor/jszip-3.10.1/jszip.min.js');
const root = path.resolve(__dirname, '../..');

async function fixture() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OPS/book.opf', '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">authored-short-page-qa</dc:identifier><dc:title>Authored short page QA</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c0" href="c0.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c0"/><itemref idref="c1"/></spine></package>');
  const prose = Array.from({ length: 40 }, (_, i) => `<p>Garden ${i}. A visitor walks beside the quiet river. Sunlight warms the bridge and birds return to the garden.</p>`).join('');
  zip.file('OPS/c0.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Garden</title></head><body>${prose}</body></html>`);
  zip.file('OPS/c1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Boundary</title></head><body><p class="qa-short-line">Next QA line.</p></body></html>');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function main() {
  const book = await fixture();
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(root, '.' + pathname);
      assert.ok(file.startsWith(root + path.sep));
      const body = pathname === '/qa/short.epub' ? book : await fs.readFile(file);
      res.setHeader('Content-Type', ({ js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', epub: 'application/epub+zip' })[file.split('.').pop()] || 'application/octet-stream');
      res.end(body);
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--no-proxy-server'] });
  let count = 0, failures = 0;
  const context = await browser.newContext({ viewport: { width: 393, height: 740 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const run = async (name, check) => {
    count++;
    try { await check(); assert.deepEqual(errors, []); console.log('PASS ' + name); }
    catch (error) { failures++; console.log('FAIL ' + name + ': ' + error.message); }
  };
  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '/pwa-reader/r3.html');
    await page.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
    await page.evaluate(async () => {
      const app = document.querySelector('#r3-root').__r3App;
      await app.controller.setUiLanguage('en');
      const blob = await (await fetch('/qa/short.epub')).blob();
      await app.controller.importBook(new File([blob], 'authored-short.epub', { type: 'application/epub+zip', lastModified: 1 }));
      window.qaBook = app.store.getState().importStatus.lastImportedBookKey;
      await app.controller.selectBook(window.qaBook); await app.controller.navigate('shell.home');
      const { bootstrapR3App } = await import('/pwa-reader/ui-r3/bootstrap.js');
      const { createR3Store } = await import('/pwa-reader/ui-r3/store.js');
      const { createR3Controller } = await import('/pwa-reader/ui-r3/controller.js');
      const { createBooksAdapter } = await import('/pwa-reader/adapters/booksAdapter.js');
      const reader = await import('/pwa-reader/adapters/readerAdapter.js');
      const books = createBooksAdapter(), detail = await books.getBookDetail(window.qaBook);
      // A fixed authored list gives both shell routes a measurable scroll range.
      // Opening and saving the first book still use the production Reader/storage.
      const list = Array.from({ length: 12 }, (_, i) => ({ ...detail, bookKey: i ? 'authored-row-' + i : window.qaBook, title: 'Authored fixture ' + i }));
      app.unsubscribe();
      const old = document.querySelector('#r3-root'), root = document.createElement('main'); root.id = 'r3-root'; old.replaceWith(root);
      const store = createR3Store();
      const controller = createR3Controller({ store, adapters: {
        books: { ...books, listBooks: async () => list, getContinueReading: async () => detail },
        reader: { ...reader, async savePosition(...args) {
          if (window.qaHoldSave) { window.qaSaveEntered = true; await new Promise(resolve => window.qaReleaseSave = resolve); }
          return reader.savePosition(...args);
        } }
      }, waitForReaderTurn: () => root.__readerLayout?.waitForTurn() });
      await bootstrapR3App({ document, root, store, controller });
    });
    const navigate = route => page.evaluate(route => document.querySelector('#r3-root').__r3App.controller.navigate(route), route);
    const scroll = value => page.evaluate(value => { const main = document.querySelector('.r3-main'); main.scrollTop = value; return main.scrollTop; }, value);
    const scrollTop = () => page.evaluate(() => document.querySelector('.r3-main').scrollTop);
    const back = async route => {
      await page.evaluate(() => document.querySelector('#r3-root').__readerHistory.back());
      await page.waitForFunction(route => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === route, route);
      await page.evaluate(() => document.querySelector('#r3-root').__readerHistory.whenSettled()); await frames();
    };
    for (const route of ['shell.home', 'shell.library']) {
      await run(route + ' neutral rerender preserves scroll', async () => {
        await navigate(route); assert.equal(await scroll(160), 160);
        const result = await page.evaluate(async () => {
          const before = document.querySelector('.r3-main'), geometry = [before.scrollHeight, before.clientHeight, innerHeight];
          const { r3Actions } = await import('/pwa-reader/ui-r3/actions.js'); const app = document.querySelector('#r3-root').__r3App;
          app.store.dispatch(r3Actions.setSettingsState({ busy: app.store.getState().settings.busy }));
          const after = document.querySelector('.r3-main'); return { geometry, afterGeometry: [after.scrollHeight, after.clientHeight, innerHeight], top: after.scrollTop };
        });
        assert.deepEqual(result.afterGeometry, result.geometry); assert.equal(result.top, 160);
      });
      await run(route + ' Reader/history return preserves scroll through shell refresh', async () => {
        await navigate(route); assert.equal(await scroll(160), 160);
        await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.selectBook(window.qaBook));
        await back(route); assert.equal(await scrollTop(), 160);
      });
      await run(route + ' content-neutral books refresh preserves scroll', async () => {
        await navigate(route); await scroll(160);
        await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.loadBooks());
        assert.equal(await scrollTop(), 160);
      });
      await run(route + ' Settings return preserves scroll', async () => {
        await navigate(route); await scroll(160);
        await page.evaluate(async () => { const root = document.querySelector('#r3-root'); await root.__r3App.controller.navigate('settings.home'); await root.__r3App.controller.returnFromSettings(); await root.__readerHistory.whenSettled(); });
        assert.equal(await scrollTop(), 160);
      });
    }
    await run('Home Guide/history return preserves scroll', async () => {
      await navigate('shell.home'); await scroll(160);
      await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.openGuide());
      await back('shell.home'); assert.equal(await scrollTop(), 160);
    });
    await run('fresh navigation starts at top rather than restoring a previous route visit', async () => {
      await navigate('shell.library'); await scroll(210);
      await navigate('shell.home'); assert.equal(await scrollTop(), 0); await scroll(160);
      await navigate('shell.library'); await frames(); assert.equal(await scrollTop(), 0);
    });
    await run('explicit navigation to the current shell route retains its initial-scroll policy', async () => {
      for (const route of ['shell.home', 'shell.library']) {
        await navigate(route); await scroll(160); await navigate(route); assert.equal(await scrollTop(), 0);
      }
    });
    await run('abandoned history return cannot restore scroll over newer navigation', async () => {
      await navigate('shell.library'); await scroll(160);
      await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        await app.controller.selectBook(window.qaBook);
        const { getReadingProgress } = await import('/pwa-reader/storage.js');
        const position = (await getReadingProgress(window.qaBook)).logicalPosition;
        window.qaHoldSave = true; window.qaSaveEntered = false;
        app.controller.recordReaderPosition({ ...position, textOffset: position.textOffset + 1 });
        window.qaWriting = app.controller.flushReaderProgress(); root.__readerHistory.back();
      });
      await page.waitForFunction(() => window.qaSaveEntered && document.querySelector('#r3-root').__r3App.controller.getNavigationState().pending);
      await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), newer = root.__r3App.controller.navigate('shell.home');
        window.qaHoldSave = false; window.qaReleaseSave(); await newer; await window.qaWriting; await root.__readerHistory.whenSettled();
      });
      assert.equal(await scrollTop(), 0); await scroll(40); await frames(); assert.equal(await scrollTop(), 40);
    });

    await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.selectBook(window.qaBook));
    await run('nonzero Page position and pagination remain stable through chrome toggles', async () => {
      await page.evaluate(() => document.querySelector('#r3-root').__readerLayout.seek(1)); await frames();
      const capture = () => page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App; await app.controller.flushReaderProgress();
        const { getReadingProgress } = await import('/pwa-reader/storage.js'), scroll = root.querySelector('.r3-reader-scroll'), rect = root.querySelector('.r3-reader-content').getBoundingClientRect();
        return { position: (await getReadingProgress(window.qaBook)).logicalPosition, pagination: app.store.getState().reader.pagination, left: scroll.scrollLeft, top: scroll.scrollTop, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } };
      });
      const before = await capture(); assert.ok(before.position.textOffset > 0); assert.equal(before.pagination.pageIndex, 1);
      for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.toggleReaderChrome()); await frames(); assert.deepEqual(await capture(), before); }
    });
    await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.selectReaderChapter(1));
    const cdp = await context.newCDPSession(page);
    const sample = () => page.evaluate(async () => {
      const root = document.querySelector('#r3-root'), app = root.__r3App; await app.controller.flushReaderProgress();
      const line = root.querySelector('.qa-short-line'), range = document.createRange(); range.selectNodeContents(line);
      const r = range.getClientRects()[0], header = root.querySelector('.r3-reader-header'), footer = root.querySelector('.r3-reader-footer'), host = root.querySelector('.r3-reader-scroll');
      const { getReadingProgress } = await import('/pwa-reader/storage.js');
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return { rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, headerBottom: header.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top,
        hitsProse: Boolean(hit?.closest('.r3-reader-content')), left: host.scrollLeft, top: host.scrollTop,
        pagination: app.store.getState().reader.pagination, position: (await getReadingProgress(window.qaBook)).logicalPosition,
        status: app.store.getState().reader.status, loading: app.store.getState().loading.isLoading };
    });
    const checkChrome = async () => {
      const before = await sample(); assert.ok(before.rect.top >= before.headerBottom + 2, JSON.stringify(before));
      assert.ok(before.rect.bottom <= before.footerTop - 2, JSON.stringify(before)); assert.equal(before.hitsProse, true);
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.toggleReaderChrome()); await frames();
        const after = await sample(); assert.deepEqual(after.rect, before.rect); assert.deepEqual(after.position, before.position);
        assert.deepEqual(after.pagination, before.pagination); assert.equal(after.left, before.left); assert.equal(after.top, before.top);
        assert.equal(after.status, 'ready'); assert.equal(after.loading, false);
      }
    };
    for (const [name, viewport, insets, appearance] of [
      ['reproducing portrait', { width: 393, height: 740 }, { top: 47, left: 0, right: 0, bottom: 34 }, { fontSize: 'md', lineHeight: 'normal', margin: 'medium' }],
      ['small tight narrow', { width: 393, height: 740 }, { top: 47, left: 0, right: 0, bottom: 34 }, { fontSize: 'sm', lineHeight: 'tight', margin: 'narrow' }],
      ['large relaxed wide', { width: 393, height: 740 }, { top: 47, left: 0, right: 0, bottom: 34 }, { fontSize: 'xl', lineHeight: 'relaxed', margin: 'wide' }],
      ['landscape safe areas', { width: 852, height: 393 }, { top: 0, left: 59, right: 59, bottom: 21 }, { fontSize: 'xl', lineHeight: 'relaxed', margin: 'wide' }]
    ]) await run(name + ' short final Page clears chrome and remains stable', async () => {
      await page.setViewportSize(viewport); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
      await page.evaluate(async appearance => { const root = document.querySelector('#r3-root'); await root.__r3App.controller.setReaderAppearance({ ...appearance, theme: 'light' }); root.__readerLayout.seek(99999); }, appearance);
      // Let the existing 80ms resize restoration finish before starting turns.
      await page.waitForTimeout(120); await frames(); const state = await sample(); assert.equal(state.pagination.pageCount, 1); assert.equal(state.pagination.pageIndex, 0);
      assert.ok(state.rect.left >= insets.left && state.rect.right <= viewport.width - insets.right, JSON.stringify(state)); await checkChrome();
      if (name === 'reproducing portrait') console.log('Page clearance: ' + JSON.stringify({ textTop: state.rect.top, textBottom: state.rect.bottom, headerBottom: state.headerBottom }));
    });
    await run('chapter boundaries retain the readable one-line Page', async () => {
      await page.evaluate(() => document.querySelector('#r3-root').__readerLayout.turn(-1)); await frames();
      const end = await page.evaluate(() => document.querySelector('#r3-root').__r3App.store.getState().reader.pagination);
      assert.ok(end.pageCount > 1); assert.equal(end.pageIndex, end.pageCount - 1);
      await page.evaluate(() => document.querySelector('#r3-root').__readerLayout.turn(1)); await frames(); await checkChrome();
    });
    await run('Scroll remains stable through chrome toggles', async () => {
      await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.setReadingLayout('scroll')); await frames();
      const before = await sample();
      for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.toggleReaderChrome()); await frames(); }
      const after = await sample(); assert.deepEqual(after.position, before.position); assert.deepEqual(after.rect, before.rect); assert.equal(after.top, before.top);
    });
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  console.log(`${count - failures}/${count} confirmed-defect scenarios passed`);
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
