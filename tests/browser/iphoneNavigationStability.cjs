// R4.3 mounted navigation races, using only the authored smoke EPUB.
// NODE_PATH=<bundled node_modules> node tests/browser/iphoneNavigationStability.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '../..');

async function main() {
  const baseline = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/qa-empty.html') { res.setHeader('Content-Type', 'text/html'); res.end('<title>Worker activation checkpoint</title>'); return; }
      const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      assert.ok(file.startsWith(root + path.sep));
      // This server switches exact revisions in-process for the update test.
      // HTTP caching must not replay the earlier fixture worker as a new release.
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', ({ js: 'text/javascript', css: 'text/css', html: 'text/html',
        json: 'application/json', epub: 'application/epub+zip' })[file.split('.').pop()] || 'application/octet-stream');
      const body = baseline.get(pathname) || await fs.readFile(file);
      res.end(body);
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const engine = process.env.READER_QA_ENGINE === 'webkit' ? webkit : chromium;
  let browser, failures = 0, count = 0;
  try {
    browser = await engine.launch(engine === chromium
      ? { channel: 'msedge', headless: true, args: ['--no-proxy-server'] } : { headless: true });
    for (const standalone of process.env.READER_QA_FILTER === 'update' ? [] : [false, true]) for (const layout of ['page', 'scroll']) {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
      if (standalone) await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const setup = async () => {
        await page.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
        await page.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
        await page.evaluate(async layout => {
          const reader = await import('/pwa-reader/adapters/readerAdapter.js');
          const { bootstrapR3App } = await import('/pwa-reader/ui-r3/bootstrap.js');
          const { createR3Controller } = await import('/pwa-reader/ui-r3/controller.js');
          const { createR3Store } = await import('/pwa-reader/ui-r3/store.js');
          const old = document.querySelector('#r3-root'); old.__r3App.unsubscribe();
          const root = document.createElement('main'); root.id = 'r3-root'; old.replaceWith(root);
          window.qaHoldSave = false; window.qaHoldOpen = false;
          const store = createR3Store();
          const controller = createR3Controller({ store, adapters: { reader: {
            ...reader,
            async savePosition(...args) {
              if (window.qaHoldSave) {
                window.qaSaveEntered = true;
                await new Promise(resolve => window.qaReleaseSave = resolve);
              }
              return reader.savePosition(...args);
            },
            async openBook(...args) {
              if (window.qaHoldOpen) {
                window.qaOpenEntered = true;
                await new Promise(resolve => window.qaReleaseOpen = resolve);
              }
              return reader.openBook(...args);
            }
          } }, waitForReaderTurn: () => root.__readerLayout?.waitForTurn() });
          const app = await bootstrapR3App({ document, root, store, controller });
          await controller.setUiLanguage('en');
          const blob = await (await fetch('/tests/fixtures/interleaf_smoke.epub')).blob();
          await controller.importBook(new File([blob], 'smoke.epub', { type: 'application/epub+zip', lastModified: 1 }));
          window.qaBook = store.getState().importStatus.lastImportedBookKey;
          await controller.navigate('shell.library'); await controller.selectBook(window.qaBook);
          // The preface fits one Page; chapter one exercises a real Page return.
          await controller.selectReaderChapter(1);
          await controller.setReadingLayout(layout); await controller.setReaderAppearance({ theme: 'dark' });
          await document.fonts.ready;
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
          if (layout === 'page') root.__readerLayout.seek(1);
          else { const scroll = root.querySelector('.r3-reader-scroll'); scroll.scrollTop = 150; scroll.dispatchEvent(new Event('scroll')); }
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
          root.__readerLayout.onScroll();
          if (layout === 'page' && store.getState().reader.pagination.pageIndex !== 1)
            throw Error('fixture must provide a nonzero Page position');
          await controller.flushReaderProgress();
          window.qaStates = [];
          app.store.subscribe(state => window.qaStates.push({ route: state.activeScreen,
            theme: state.reader.readerAppearance.theme, dom: root.dataset.r3ActiveScreen, overlay: state.openOverlay }));
          window.qaBefore = (await (await import('/pwa-reader/storage.js')).getReadingProgress(window.qaBook)).logicalPosition;
          window.qaScroll = { left: root.querySelector('.r3-reader-scroll').scrollLeft,
            top: root.querySelector('.r3-reader-scroll').scrollTop };
        }, layout);
      };
      const run = async (name, fn) => {
        count++;
        try { await setup(); await fn(); assert.deepEqual(errors, []); console.log(`PASS ${standalone ? 'standalone' : 'browser'} ${layout}: ${name}`); }
        catch (error) { failures++; console.log(`FAIL ${standalone ? 'standalone' : 'browser'} ${layout}: ${name}: ${error.message}`); }
      };
      await run('Return invalidates a pending Settings entry', async () => {
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          window.qaHoldSave = true;
          // Change source anchor so the next progress write cannot deduplicate.
          app.controller.recordReaderPosition({ chapterId: app.store.getState().activeChapterId,
            textOffset: (window.qaBefore?.textOffset || 0) + 1 });
          window.qaWriting = app.controller.flushReaderProgress();
          window.qaEntering = app.controller.navigate('settings.home');
          await new Promise(resolve => setTimeout(resolve, 0));
          assertSaveEntered();
          await app.controller.returnFromSettings();
          window.qaStates = [];
          window.qaHoldSave = false; window.qaReleaseSave(); await window.qaEntering;
          await root.__readerHistory.whenSettled();
          const state = app.store.getState();
          return { route: state.activeScreen, dom: root.dataset.r3ActiveScreen,
            history: history.state.interleafR3.screen, theme: state.reader.readerAppearance.theme,
            reopened: window.qaStates.some(state => state.route.startsWith('settings.')) };
          function assertSaveEntered() { if (!window.qaSaveEntered) throw Error('save gate not reached'); }
        });
        assert.equal(result.route, 'reader.canvas'); assert.equal(result.dom, 'reader.canvas');
        assert.equal(result.history, 'reader.canvas'); assert.equal(result.theme, 'dark'); assert.equal(result.reopened, false);
      });
      await run('Forward invalidates a running Back before it publishes another route', async () => {
        await page.evaluate(() => {
          const app = document.querySelector('#r3-root').__r3App;
          window.qaHoldSave = true;
          app.controller.recordReaderPosition({ chapterId: app.store.getState().activeChapterId,
            textOffset: (window.qaBefore?.textOffset || 0) + 1 });
          window.qaWriting = app.controller.flushReaderProgress();
          history.back();
        });
        await page.waitForFunction(() => window.qaSaveEntered);
        await page.evaluate(() => history.forward());
        await page.waitForFunction(() => history.state.interleafR3.screen === 'reader.canvas');
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'); window.qaStates = [];
          window.qaHoldSave = false; window.qaReleaseSave(); await root.__readerHistory.whenSettled();
          return { states: window.qaStates, route: root.__r3App.store.getState().activeScreen, dom: root.dataset.r3ActiveScreen };
        });
        assert.equal(result.route, 'reader.canvas'); assert.equal(result.dom, 'reader.canvas');
        assert.ok(result.states.every(state => state.route === 'reader.canvas' && state.theme === 'dark'), JSON.stringify(result.states));
      });
      await run('abandoned Forward book restore cannot reopen dismissed Settings', async () => {
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'shell.library');
        await page.evaluate(() => { window.qaHoldOpen = true; history.forward(); });
        await page.waitForFunction(() => window.qaOpenEntered);
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          await app.controller.navigate('settings.home'); await app.controller.returnFromSettings();
          window.qaStates = []; window.qaHoldOpen = false; window.qaReleaseOpen();
          await root.__readerHistory.whenSettled();
          return { route: app.store.getState().activeScreen, dom: root.dataset.r3ActiveScreen,
            history: history.state.interleafR3.screen, states: window.qaStates };
        });
        assert.equal(result.route, 'shell.library'); assert.equal(result.dom, 'shell.library');
        assert.equal(result.history, 'shell.library');
        assert.ok(result.states.every(state => state.route === 'shell.library'), JSON.stringify(result.states));
      });
      await run('Dark Reader exits without a Light Reader frame', async () => {
        const result = await page.evaluate(async () => {
          await document.querySelector('#r3-root').__r3App.controller.navigate('shell.library');
          return window.qaStates;
        });
        assert.ok(result.every(state => state.route !== 'reader.canvas' || state.theme === 'dark'), JSON.stringify(result));
      });
      await run('chapter restore waiting on save cannot commit after Settings Return', async () => {
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          const origin = app.store.getState().activeChapterId;
          window.qaHoldSave = true;
          app.controller.recordReaderPosition({ chapterId: origin, textOffset: window.qaBefore.textOffset + 1 });
          const chapter = app.controller.selectReaderChapter(0);
          await new Promise(resolve => setTimeout(resolve, 0));
          if (!window.qaSaveEntered) throw Error('chapter save gate not reached');
          const entering = app.controller.navigate('settings.home');
          await app.controller.returnFromSettings();
          window.qaHoldSave = false; window.qaReleaseSave();
          await Promise.all([chapter, entering]);
          return { origin, chapter: app.store.getState().activeChapterId, route: app.store.getState().activeScreen };
        });
        assert.equal(result.chapter, result.origin); assert.equal(result.route, 'reader.canvas');
      });
      await run('canceled Settings origin cannot reuse pixels from an older visit', async () => {
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          window.qaHoldSave = true;
          app.controller.recordReaderPosition({ chapterId: app.store.getState().activeChapterId,
            textOffset: window.qaBefore.textOffset + 1 });
          const writing = app.controller.flushReaderProgress();
          const entering = app.controller.navigate('settings.home'), leaving = app.controller.navigate('shell.library');
          await new Promise(resolve => setTimeout(resolve, 0));
          window.qaHoldSave = false; window.qaReleaseSave(); await Promise.all([writing, entering, leaving]);
          if (app.store.getState().settings.returnScreen !== null) throw Error('abandoned origin metadata retained');
          await app.controller.selectBook(window.qaBook); await app.controller.selectReaderChapter(1);
          await app.controller.seekReaderPosition({ chapterId: app.store.getState().activeChapterId, textOffset: 0 });
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
          root.__readerLayout.onScroll(); await app.controller.flushReaderProgress();
          const before = { left: root.querySelector('.r3-reader-scroll').scrollLeft, top: root.querySelector('.r3-reader-scroll').scrollTop };
          await app.controller.navigate('settings.home'); await app.controller.returnFromSettings();
          await root.__readerHistory.whenSettled();
          return { before, after: { left: root.querySelector('.r3-reader-scroll').scrollLeft, top: root.querySelector('.r3-reader-scroll').scrollTop } };
        });
        assert.deepEqual(result.after, result.before);
      });
      await run('nested Settings Back and Forward preserve durable and visual origin', async () => {
        await page.evaluate(async () => {
          const app = document.querySelector('#r3-root').__r3App;
          await app.controller.navigate('settings.home'); await app.controller.navigate('settings.language');
          history.back();
        });
        await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'reader.canvas');
        await page.evaluate(() => { window.qaStates = []; history.forward(); });
        await page.waitForFunction(() => history.state.interleafR3.screen === 'reader.canvas' && history.state.interleafR3.consumedSettings);
        const result = await page.evaluate(async () => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          await root.__readerHistory.whenSettled(); await app.controller.flushReaderProgress();
          const after = (await (await import('/pwa-reader/storage.js')).getReadingProgress(window.qaBook)).logicalPosition;
          const scroll = root.querySelector('.r3-reader-scroll');
          return { before: window.qaBefore, after, expectedScroll: window.qaScroll,
            scroll: { left: scroll.scrollLeft, top: scroll.scrollTop }, route: app.store.getState().activeScreen,
            dom: root.dataset.r3ActiveScreen, theme: app.store.getState().reader.readerAppearance.theme,
            overlay: app.store.getState().openOverlay, settings: !!root.querySelector('.r3-settings-screen'),
            reopened: window.qaStates.some(state => state.route.startsWith('settings.')) };
        });
        assert.deepEqual(result.after, result.before); assert.deepEqual(result.scroll, result.expectedScroll);
        assert.equal(result.route, 'reader.canvas'); assert.equal(result.dom, 'reader.canvas');
        assert.equal(result.theme, 'dark'); assert.equal(result.overlay, null); assert.equal(result.settings, false); assert.equal(result.reopened, false);
        await fs.mkdir(path.join(root, 'generated/r43-navigation-qa'), { recursive: true });
        await page.screenshot({ path: path.join(root, `generated/r43-navigation-qa/${standalone ? 'standalone' : 'browser'}-${layout}.png`) });
      });
      await context.close();
    }
    // Exact R4.2 worker and changed runtime bytes, then the local R4.3 update.
    const { execFileSync } = require('node:child_process');
    for (const file of ['sw.js', 'ui-r3/controller.js', 'ui-r3/bootstrap.js', 'ui-r3/readerHistory.js',
      'ui-r3/readerLayout.js', 'ui-r3/readerInteractionTrace.js']) baseline.set('/pwa-reader/' + file,
      execFileSync('git', ['-C', root, 'show', '9b4857dc73c09bdc6ac024475f3518e98029f584:pwa-reader/' + file]));
    const upgrade = await browser.newContext(); let old = await upgrade.newPage();
    await old.goto(origin + '/pwa-reader/r3.html'); await old.evaluate(() => navigator.serviceWorker.ready);
    await old.reload(); await old.waitForFunction(() => navigator.serviceWorker.controller
      && document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
    assert.equal(await old.evaluate(() => typeof document.querySelector('#r3-root').__r3App.controller.getNavigationState), 'undefined');
    const waitForWorker = phase => old.evaluate(async phase => {
      const deadline = performance.now() + 10000;
      while (performance.now() < deadline) {
        const registration = await navigator.serviceWorker.getRegistration('/pwa-reader/');
        if (phase === 'waiting' && registration?.waiting?.state === 'installed') return;
        if (phase === 'activated' && registration?.active?.state === 'activated' && !registration.waiting
          && !(await caches.keys()).includes('interleaf-reader-static-v8')) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw Error('worker did not reach ' + phase);
    }, phase);
    baseline.clear();
    await old.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
    await waitForWorker('waiting');
    const waiting = await old.evaluate(() => caches.keys());
    assert.ok(waiting.includes('interleaf-reader-static-v8') && waiting.includes('interleaf-reader-static-v11'));
    await old.close(); old = await upgrade.newPage();
    // Wait outside the worker scope so a new Reader client cannot keep v8 alive.
    await old.goto(origin + '/qa-empty.html');
    await waitForWorker('activated');
    await old.goto(origin + '/pwa-reader/r3.html');
    await old.waitForFunction(() => typeof document.querySelector('#r3-root')?.__r3App?.controller.getNavigationState === 'function');
    const cacheProof = await old.evaluate(async () => {
      const cache = await caches.open('interleaf-reader-static-v11');
      const response = await cache.match('/pwa-reader/ui-r3/controller.js');
      return { controller: response ? (await response.text()).includes('getNavigationState') : null,
        keys: await caches.keys(), controllerURL: navigator.serviceWorker.controller?.scriptURL };
    });
    assert.equal(cacheProof.controller, true);
    await upgrade.setOffline(true); await old.reload();
    await old.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
    assert.equal(await old.evaluate(() => typeof document.querySelector('#r3-root').__r3App.controller.getNavigationState), 'function');
    const offlineController = await old.evaluate(async () => (await fetch('/pwa-reader/ui-r3/controller.js')).text());
    assert.equal(offlineController, await fs.readFile(path.join(root, 'pwa-reader/ui-r3/controller.js'), 'utf8'));
    await upgrade.close(); count++; console.log('PASS R4.2 v8 -> waiting v11 -> close clients -> v11 offline runtime bytes');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
  console.log(`${count - failures}/${count} navigation scenarios passed`);
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
