// Mounted-app recovery regressions. Authored EPUB; no private books or remote data.
// NODE_PATH=<bundled node_modules> node tests/browser/safariInteractionRecovery.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const JSZip = require('../../pwa-reader/vendor/jszip-3.10.1/jszip.min.js');
const root = path.resolve(__dirname, '../..');
async function fixture() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
  zip.file('OPS/book.opf', '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">r4-authored</dc:identifier><dc:title>Recovery Garden</dc:title><dc:language>en</dc:language></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');
  const prose = Array.from({ length: 80 }, (_, i) => `<p>Garden ${i}. A visitor will mutter beside the quiet river. The winding path leads to a bridge and sunlight warms the water. We continue through the garden to watch birds return.</p>`).join('');
  for (const chapter of ['a', 'b']) zip.file(`OPS/${chapter}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Garden ${chapter}</title></head><body><h1>Garden</h1>${prose}</body></html>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}
async function main() {
  const epub = await fixture();
  // Replay the exact reviewed runtime without touching any checkout or Git state.
  const originals = new Map();
  if (process.env.READER_QA_BASELINE === '1') {
    const { execFileSync } = require('node:child_process');
    for (const file of ['ui-r3/bootstrap.js', 'ui-r3/controller.js', 'ui-r3/readerHistory.js',
      'ui-r3/readerLayout.js', 'ui-r3/readerPageTurn.js', 'ui-r3/styles/base.css',
      'locales/en.js', 'locales/zh-CN.js', 'sw.js']) {
      originals.set('/pwa-reader/' + file, execFileSync('git', ['-C', root, 'show',
        '2206f3ea5b49d235a6415d341cab8a057944cd8f:pwa-reader/' + file]));
    }
  }
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      assert.ok(file.startsWith(root + path.sep));
      res.setHeader('Content-Type', ({ js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', epub: 'application/epub+zip' })[file.split('.').pop()] || 'application/octet-stream');
      res.end(pathname === '/qa.epub' ? epub : originals.get(pathname) || await fs.readFile(file));
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const engine = process.env.READER_QA_ENGINE === 'webkit' ? webkit : chromium;
  let browser;
  const results = [];
  try {
    browser = await engine.launch(engine === chromium ? { channel: 'msedge', headless: true, args: ['--no-proxy-server'] } : { headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
    await page.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
    await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
    const bookId = await page.evaluate(async () => {
      const app = document.querySelector('#r3-root').__r3App;
      const blob = await (await fetch('/qa.epub')).blob();
      await app.controller.importBook(new File([blob], 'garden.epub', { type: 'application/epub+zip', lastModified: 1 }));
      const id = app.store.getState().importStatus.lastImportedBookKey;
      await app.controller.navigate('shell.library');
      await app.controller.selectBook(id); await document.fonts.ready;
      return id;
    });
    await page.waitForTimeout(150);
    const run = async (name, fn) => {
      if (process.env.READER_QA_FILTER && !name.includes(process.env.READER_QA_FILTER)) return;
      try { await fn(); results.push({ name, passed: true }); console.log('PASS ' + name); }
      catch (error) { results.push({ name, passed: false, error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
    };
    const read = () => page.evaluate(() => document.querySelector('#r3-root').__r3App.store.getState());
    const reset = () => page.evaluate(async () => {
      const root = document.querySelector('#r3-root'), app = root.__r3App;
      if (app.store.getState().activeScreen.startsWith('settings.')) await app.controller.returnFromSettings();
      app.controller.closeOverlay(); app.controller.closeVocabularyBubble();
      document.getSelection().removeAllRanges();
      await app.controller.setReadingLayout('page');
      root.__readerLayout.seek(0); await app.controller.flushReaderProgress();
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    });
    const swipe = (options = {}) => page.evaluate(options => {
      const root = document.querySelector('#r3-root');
      const surface = root.querySelector('.r3-reader-scroll');
      const target = surface.querySelector('p') || surface;
      const { id = 50, start = 280, end = 110, delay = 100, cancel = false } = options;
      const send = (type, x, time, at = target) => {
        const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id, isPrimary: true, clientX: x, clientY: 400 });
        Object.defineProperty(event, 'timeStamp', { value: time }); at.dispatchEvent(event);
      };
      send('pointerdown', start, 1000);
      send('pointermove', start - Math.sign(start - end) * 20, 1030);
      send(cancel ? 'pointercancel' : 'pointerup', end, 1000 + delay);
      return root.__readerLayout.waitForTurn();
    }, options);
    await run('lost terminal after detached touch target recovers on next primary swipe', async () => {
      await reset();
      await page.evaluate(() => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        const target = root.querySelector('.r3-reader-content p');
        target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: 280, clientY: 400 }));
        app.controller.openReaderContents();
        if (target.isConnected) throw Error('Touch target was not detached');
        window.dispatchEvent(new PointerEvent('pointercancel', { pointerType: 'touch', pointerId: 7, isPrimary: true }));
        app.controller.closeOverlay();
      });
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 1);
    });
    await run('Settings return preserves session and creates no forward Settings entry', async () => {
      await reset();
      const before = await page.evaluate(() => ({ history: history.length, state: history.state,
        session: document.querySelector('#r3-root').__readerInteractionTrace?.snapshot().at(-1)?.session }));
      await page.locator('[data-action="navigate"][data-route="settings.home"]').click();
      await page.locator('[data-action="set-ui-language"][data-ui-language="zh-CN"]').click();
      await page.locator('[data-action="settings-return"]').click();
      await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'reader.canvas');
      assert.equal((await read()).activeBookId, bookId);
      assert.equal(await page.evaluate(() => document.querySelector('#r3-root').__readerInteractionTrace?.snapshot().at(-1)?.session), before.session);
      const length = await page.evaluate(() => history.length);
      await page.evaluate(() => history.forward()); await page.waitForTimeout(100);
      assert.equal((await read()).activeScreen, 'reader.canvas');
      assert.equal(length, before.history + 1);
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 1);
    });
    await run('lifecycle interruption cancels active turn and permits retry', async () => {
      await reset();
      const result = await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        const before = await app.controller.flushReaderProgress();
        const done = root.__readerLayout.turn(1);
        await new Promise(resolve => setTimeout(resolve, 30));
        window.dispatchEvent(new Event('pagehide'));
        const completed = await done;
        const page = app.store.getState().reader.pagination.pageIndex;
        return { completed, page, retry: await root.__readerLayout.turn(1) };
      });
      assert.deepEqual(result, { completed: false, page: 0, retry: true });
    });
    await run('deliberate swipe once claimed, fast flick and rejected short move', async () => {
      await reset(); await swipe({ delay: 650 }); assert.equal((await read()).reader.pagination.pageIndex, 1);
      await swipe({ delay: 40 }); assert.equal((await read()).reader.pagination.pageIndex, 2);
      await swipe({ end: 250 }); assert.equal((await read()).reader.pagination.pageIndex, 2);
    });
    await run('pointer cancellation and edge gestures never turn or route', async () => {
      await reset(); await swipe({ cancel: true }); await swipe({ start: 10, end: 130 }); await swipe({ start: 385, end: 240 });
      assert.equal((await read()).reader.pagination.pageIndex, 0); assert.equal((await read()).activeScreen, 'reader.canvas');
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 1);
    });
    await run('pending gesture cannot survive Settings render and return', async () => {
      await reset();
      await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        const target = root.querySelector('.r3-reader-content p');
        target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 51, isPrimary: true, clientX: 280, clientY: 400 }));
        await app.controller.navigate('settings.home'); await app.controller.returnFromSettings();
        window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 51, isPrimary: true, clientX: 110, clientY: 400 }));
        return root.__readerLayout.waitForTurn();
      });
      assert.equal((await read()).reader.pagination.pageIndex, 0);
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 1);
    });
    await run('native selection and vocabulary bubble block only until closed', async () => {
      await reset(); await page.waitForTimeout(460);
      await page.evaluate(() => {
        const node = document.querySelector('.r3-reader-content p').firstChild;
        const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 2);
        document.getSelection().addRange(range); document.dispatchEvent(new Event('selectionchange'));
      });
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 0);
      await page.evaluate(() => document.getSelection().removeAllRanges());
      await page.evaluate(async () => {
        const app = document.querySelector('#r3-root').__r3App;
        await app.controller.setReaderVocabularyState('learning', 'visitor', {
          sentence: 'A visitor will mutter beside the quiet river.', targetOffset: 2, targetEnd: 9
        });
      });
      await page.evaluate(() => {
        const hit = document.querySelector('.r3-reader-content .vocab-hit');
        if (!hit) {
          const reader = document.querySelector('#r3-root').__r3App.store.getState().reader;
          throw Error(JSON.stringify({ mode: reader.effectiveMode, items: reader.vocabularyItems?.length,
            words: reader.learningWords, message: reader.vocabularyMessage, html: reader.html?.slice(0, 130) }));
        }
        hit.click();
      });
      assert.ok((await read()).reader.vocabularyBubble);
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 0);
      await page.evaluate(() => document.querySelector('#r3-root').__r3App.controller.closeVocabularyBubble());
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 1);
    });
    if (engine === chromium) await run('real browser touch input turns repeatedly after Settings language return', async () => {
      await reset();
      await page.locator('[data-action="navigate"][data-route="settings.home"]').click();
      await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
      await page.locator('[data-action="settings-return"]').click();
      const cdp = await context.newCDPSession(page);
      try {
        for (let turn = 1; turn <= 3; turn++) {
          const point = await page.evaluate(() => {
            for (const y of [350, 400, 450, 500]) for (const x of [280, 300, 260]) {
              const target = document.elementFromPoint(x, y);
              if (target?.closest('.r3-reader-content') && !target.closest('button,a')) return { x, y };
            }
            throw Error('No ordinary prose point');
          });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          for (const distance of [20, 50, 90, 130]) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x - distance, y: point.y + 2 }] });
            if (turn === 2) await page.waitForTimeout(120);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForFunction(index => document.querySelector('#r3-root').__r3App.store.getState().reader.pagination.pageIndex === index, turn);
        }
      } finally { await cdp.detach(); }
    });
    await run('rapid opposite commands are rejected observably during one animation', async () => {
      await reset();
      const result = await page.evaluate(async () => {
        const root = document.querySelector('#r3-root');
        const done = root.__readerLayout.turn(1);
        const blocked = await root.__readerLayout.turn(-1);
        const feedback = root.querySelector('.r3-reader-interaction-status')?.textContent;
        return { completed: await done, blocked, feedback };
      });
      assert.equal(result.completed, true); assert.equal(result.blocked, false); assert.ok(result.feedback);
      await fs.mkdir(path.join(root, 'generated/r4-safari-qa'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'generated/r4-safari-qa/turn-feedback.png') });
      await swipe(); assert.equal((await read()).reader.pagination.pageIndex, 2);
    });
    await run('overlay cancellation rolls back source anchor and remains usable', async () => {
      await reset();
      const result = await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        const storage = await import('/pwa-reader/storage.js');
        const id = app.store.getState().activeBookId;
        const before = (await storage.getReadingProgress(id)).logicalPosition;
        const records = [];
        const record = app.controller.recordReaderPosition;
        app.controller.recordReaderPosition = (position, metrics) => { records.push({ position, left: root.querySelector('.r3-reader-scroll')?.scrollLeft }); return record(position, metrics); };
        const done = root.__readerLayout.turn(1); await new Promise(resolve => setTimeout(resolve, 30));
        app.controller.openReaderContents(); const cancelled = await done;
        app.controller.closeOverlay(); await app.controller.flushReaderProgress();
        const after = (await storage.getReadingProgress(id)).logicalPosition;
        app.controller.recordReaderPosition = record;
        return { cancelled, before, after, records, retry: await root.__readerLayout.turn(1) };
      });
      if (process.env.READER_QA_FILTER || JSON.stringify(result.before) !== JSON.stringify(result.after)) console.log(JSON.stringify(result));
      assert.equal(result.cancelled, false); assert.deepEqual(result.before, result.after); assert.equal(result.retry, true);
    });
    await run('failed position commit rolls back source authority and permits retry', async () => {
      await reset();
      const result = await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App;
        const storage = await import('/pwa-reader/storage.js'), id = app.store.getState().activeBookId;
        const before = (await storage.getReadingProgress(id)).logicalPosition;
        const original = app.controller.recordReaderPosition;
        let failed = false;
        app.controller.recordReaderPosition = (position, metrics) => {
          original(position, metrics);
          if (!failed) { failed = true; throw Error('Authored QA commit interruption'); }
        };
        const completed = await root.__readerLayout.turn(1);
        app.controller.recordReaderPosition = original;
        await app.controller.flushReaderProgress();
        return { completed, before, after: (await storage.getReadingProgress(id)).logicalPosition,
          retry: await root.__readerLayout.turn(1), page: app.store.getState().reader.pagination.pageIndex };
      });
      assert.equal(result.completed, false); assert.deepEqual(result.after, result.before);
      assert.equal(result.retry, true); assert.equal(result.page, 1);
    });
    await run('language appearance and Page Scroll changes preserve logical position', async () => {
      await reset(); await swipe();
      const result = await page.evaluate(async () => {
        const root = document.querySelector('#r3-root'), app = root.__r3App, storage = await import('/pwa-reader/storage.js');
        const id = app.store.getState().activeBookId; await app.controller.flushReaderProgress();
        const before = (await storage.getReadingProgress(id)).logicalPosition;
        await app.controller.setUiLanguage('en'); await app.controller.setReaderAppearance({ fontSize: 'lg' });
        await app.controller.setReadingLayout('scroll'); await app.controller.setReadingLayout('page'); await app.controller.flushReaderProgress();
        return { before, after: (await storage.getReadingProgress(id)).logicalPosition, turn: await root.__readerLayout.turn(1) };
      });
      assert.deepEqual(result.before, result.after); assert.equal(result.turn, true);
    });
    await run('native Back Forward remains browser-owned and page commands never write history', async () => {
      await reset();
      const before = await page.evaluate(() => ({ length: history.length, state: history.state }));
      await swipe(); assert.deepEqual(await page.evaluate(() => ({ length: history.length, state: history.state })), before);
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'shell.library');
      await page.evaluate(() => history.forward());
      await page.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'reader.canvas');
      assert.equal((await read()).activeBookId, bookId);
    });
    await run('privacy trace is bounded and contains no reading text or book identifiers', async () => {
      const trace = await page.evaluate(() => document.querySelector('#r3-root').__readerInteractionTrace?.snapshot());
      assert.ok(trace?.length); assert.ok(trace.length <= 256);
      assert.ok(trace.some(event => event.event === 'POPSTATE'));
      assert.ok(trace.some(event => event.event === 'TURN_COMMITTED'));
      assert.doesNotMatch(JSON.stringify(trace), /Recovery Garden|Garden 0|visitor|bookKey|textOffset|chapterId/);
      const ordinary = await context.newPage(); await ordinary.goto(origin + '/pwa-reader/r3.html');
      await ordinary.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
      assert.equal(await ordinary.evaluate(() => Boolean(document.querySelector('#r3-root').__readerInteractionTrace)), false); await ordinary.close();
    });
    for (const scenario of [
      { term: 'quiet', fail: false, settingsDuringSave: false },
      { term: 'winding', fail: true, settingsDuringSave: false },
      { term: 'sunlight', fail: false, settingsDuringSave: true },
      { term: 'warms', fail: true, settingsDuringSave: true },
      { term: 'water', fail: false, settingsDuringSave: true, cancelChapterLoad: true },
      { term: 'bridge', fail: true, settingsDuringSave: true, cancelChapterLoad: true }
    ]) await run(`selection Save ${scenario.fail ? 'rollback' : 'success'} ${scenario.cancelChapterLoad ? 'after chapter cancellation and Settings return' : scenario.settingsDuringSave ? 'after Settings return' : 'during opposite turn'} retains swipe ownership`, async () => {
      const savingPage = await context.newPage();
      const saveErrors = []; savingPage.on('pageerror', error => saveErrors.push(error.message));
      let cdp;
      try {
        await savingPage.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
        await savingPage.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
        await savingPage.evaluate(async ({ bookId, term, fail }) => {
          const vocabulary = await import('/pwa-reader/adapters/vocabularyAdapter.js');
          const { bootstrapR3App } = await import('/pwa-reader/ui-r3/bootstrap.js');
          const { createR3Controller } = await import('/pwa-reader/ui-r3/controller.js');
          const { createR3Store } = await import('/pwa-reader/ui-r3/store.js');
          const { loadChapterContent } = await import('/pwa-reader/epubLoader.js');
          const previous = document.querySelector('#r3-root'); previous.__r3App.unsubscribe();
          const root = document.createElement('main'); root.id = 'r3-root'; previous.replaceWith(root);
          window.qaSaveEntered = false;
          const adapters = { vocabulary: {
            ...vocabulary, async setTermState(...args) {
              window.qaSaveEntered = true;
              await new Promise(resolve => window.qaReleaseSave = resolve);
              if (fail) throw Error('Authored QA persistence failure');
              return vocabulary.setTermState(...args);
            }
          } };
          const store = createR3Store();
          const controller = createR3Controller({ store, adapters,
            waitForReaderTurn: () => root.__readerLayout?.waitForTurn(),
            readerRuntime: { async loadChapterContent(...args) {
              if (window.qaHoldChapterLoad) {
                window.qaChapterLoadEntered = true;
                await new Promise(resolve => window.qaReleaseChapterLoad = resolve);
              }
              return loadChapterContent(...args);
            } }
          });
          const app = await bootstrapR3App({ document, root, store, controller });
          await app.controller.selectBook(bookId); await app.controller.selectReaderChapter(0);
          await app.controller.setUiLanguage('en'); await app.controller.setReadingLayout('page');
          root.__readerLayout.seek(0); await app.controller.flushReaderProgress();
          await document.fonts.ready; await new Promise(requestAnimationFrame);
          window.qaHistoryBeforeSave = { length: history.length, state: history.state };
          window.qaReaderBeforeSave = root.querySelector('.r3-reader-content');
          root.__readerInteractionTrace?.clear();
          const walker = document.createTreeWalker(window.qaReaderBeforeSave, NodeFilter.SHOW_TEXT);
          let node, selected = false;
          while ((node = walker.nextNode())) {
            const start = node.textContent.toLowerCase().indexOf(term);
            if (start < 0 || node.parentElement.closest('.vocab-hit')) continue;
            const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + term.length);
            document.getSelection().removeAllRanges(); document.getSelection().addRange(range); selected = true; break;
          }
          if (!selected) throw Error('Authored selection term unavailable');
          document.dispatchEvent(new Event('selectionchange')); await new Promise(requestAnimationFrame);
          const button = root.querySelector('[data-action="reader-selection-save"]');
          if (button.dataset.selectionTerm !== term) throw Error('Selection Save did not own the authored term');
          button.click();
          document.getSelection().removeAllRanges(); document.dispatchEvent(new Event('selectionchange'));
        }, { bookId, ...scenario });
        await savingPage.waitForFunction(() => window.qaSaveEntered);
        const optimistic = await savingPage.evaluate(term => {
          const root = document.querySelector('#r3-root'), state = root.__r3App.store.getState();
          return { sameDOM: window.qaReaderBeforeSave === root.querySelector('.r3-reader-content'),
            learning: state.reader.learningWords.includes(term), pending: state.reader.pendingVocabularyTerms.includes(term),
            saving: state.reader.vocabularySaving, underline: root.querySelector('.r3-vocabulary-pending')?.textContent };
        }, scenario.term);
        assert.deepEqual(optimistic, { sameDOM: true, learning: true, pending: true, saving: true, underline: scenario.term });
        if (engine === chromium) cdp = await context.newCDPSession(savingPage);
        const touch = async direction => {
          if (!cdp) {
            await savingPage.evaluate(async direction => {
              const root = document.querySelector('#r3-root'), target = root.querySelector('.r3-reader-content p');
              for (const [type, x] of [['pointerdown', direction > 0 ? 280 : 110], ['pointermove', direction > 0 ? 260 : 130], ['pointerup', direction > 0 ? 110 : 280]]) {
                target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 71, isPrimary: true, clientX: x, clientY: 400 }));
              }
              await root.__readerLayout.waitForTurn();
            }, direction);
            return;
          }
          const point = await savingPage.evaluate(direction => {
            const x = direction > 0 ? 285 : 110;
            for (const y of [350, 400, 450, 500]) {
              const target = document.elementFromPoint(x, y);
              if (target?.closest('.r3-reader-content') && !target.closest('.vocab-hit,button,a')) return { x, y };
            }
            throw Error('No ordinary prose touch start');
          }, direction);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          for (const distance of [20, 50, 90, 140]) await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: point.x - direction * distance, y: point.y + 2 }]
          });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await savingPage.evaluate(() => document.querySelector('#r3-root').__readerLayout.waitForTurn());
        };
        const state = () => savingPage.evaluate(() => document.querySelector('#r3-root').__r3App.store.getState());
        await touch(1); assert.equal((await state()).reader.pagination.pageIndex, 1, 'pending optimistic Save must permit a swipe');
        if (scenario.cancelChapterLoad) await savingPage.evaluate(() => document.querySelector('#r3-root').__readerLayout.seek(99999));
        const beforeSettlementPage = (await state()).reader.pagination.pageIndex;
        const before = await savingPage.evaluate(async () => {
          const app = document.querySelector('#r3-root').__r3App;
          await app.controller.flushReaderProgress();
          return (await (await import('/pwa-reader/storage.js')).getReadingProgress(app.store.getState().activeBookId)).logicalPosition;
        });
        if (scenario.settingsDuringSave) {
          if (scenario.cancelChapterLoad) {
            await savingPage.evaluate(() => {
              window.qaHoldChapterLoad = true;
              window.qaTurningChapter = document.querySelector('#r3-root').__readerLayout.turn(1);
            });
            await savingPage.waitForFunction(() => window.qaChapterLoadEntered);
          }
          await savingPage.locator('[data-action="navigate"][data-route="settings.home"]').click();
          await savingPage.locator('[data-action="settings-return"]').click();
          await savingPage.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'reader.canvas');
          await savingPage.evaluate(() => { window.qaHistoryBeforeSave = { length: history.length, state: history.state }; });
          if (scenario.cancelChapterLoad) assert.equal(await savingPage.evaluate(async () => {
            window.qaReleaseChapterLoad(); return window.qaTurningChapter;
          }), false);
          await savingPage.evaluate(() => {
            window.qaSaveTerminalTarget = document.querySelector('.r3-reader-scroll');
            window.qaSaveTerminalTarget.dispatchEvent(new PointerEvent('pointerdown', {
              bubbles: true, pointerType: 'touch', pointerId: 81, isPrimary: true, clientX: 280, clientY: 400
            }));
            window.qaReleaseSave();
          });
        } else {
          const completed = await savingPage.evaluate(async () => {
            const root = document.querySelector('#r3-root');
            const done = root.__readerLayout.turn(-1);
            await new Promise(resolve => setTimeout(resolve, 35)); window.qaReleaseSave();
            return done;
          });
          assert.equal(completed, true, 'authoritative Save refresh must wait for the opposite turn');
        }
        await savingPage.waitForFunction(() => !document.querySelector('#r3-root').__r3App.store.getState().reader.vocabularySaving);
        const settled = await savingPage.evaluate(async term => {
          const root = document.querySelector('#r3-root'), app = root.__r3App, state = app.store.getState();
          await app.controller.flushReaderProgress();
          return { learning: state.reader.learningWords.includes(term), pending: state.reader.pendingVocabularyTerms,
            message: state.reader.vocabularyMessage, visibleError: root.querySelector('.r3-vocabulary-message')?.textContent,
            annotated: [...root.querySelectorAll('.vocab-hit')].some(hit => hit.dataset.vocabTerm === term),
            authoritativeLearning: (await (await import('/pwa-reader/adapters/vocabularyAdapter.js')).getVocabularyProfile()).learningWords.includes(term),
            replacedDOM: window.qaReaderBeforeSave !== root.querySelector('.r3-reader-content'),
            staleUnderlines: root.querySelectorAll('.r3-vocabulary-pending').length, bubble: state.reader.vocabularyBubble,
            overlay: state.openOverlay, route: state.activeScreen, book: state.activeBookId,
            position: (await (await import('/pwa-reader/storage.js')).getReadingProgress(state.activeBookId)).logicalPosition,
            historyBefore: window.qaHistoryBeforeSave, historyAfter: { length: history.length, state: history.state } };
        }, scenario.term);
        assert.equal(settled.learning, !scenario.fail, 'failed Save must roll optimistic Learning back to authority');
        assert.equal(settled.authoritativeLearning, !scenario.fail); assert.equal(settled.annotated, !scenario.fail, 'Reader DOM must reflect the settled authority');
        assert.deepEqual(settled.pending, []); assert.equal(settled.staleUnderlines, 0);
        assert.equal(settled.replacedDOM, true); assert.equal(settled.bubble, null); assert.equal(settled.overlay, null);
        assert.equal(Boolean(settled.message), scenario.fail); if (scenario.fail) assert.ok(settled.visibleError, 'rollback error must be visible');
        assert.equal(settled.route, 'reader.canvas'); assert.equal(settled.book, bookId);
        assert.deepEqual(settled.historyAfter, settled.historyBefore);
        if (scenario.settingsDuringSave) {
          assert.deepEqual(settled.position, before);
          assert.equal(await savingPage.evaluate(async () => {
            const detached = !window.qaSaveTerminalTarget.isConnected;
            window.dispatchEvent(new PointerEvent('pointerup', {
              pointerType: 'touch', pointerId: 81, isPrimary: true, clientX: 110, clientY: 400
            }));
            await document.querySelector('#r3-root').__readerLayout.waitForTurn(); return detached;
          }), true, 'authoritative completion must replace the pending gesture surface');
          assert.equal((await state()).reader.pagination.pageIndex, beforeSettlementPage, 'late terminal from detached Save DOM must not turn');
        }
        // Resume on an interior page after checking the cancelled chapter-edge anchor.
        if (scenario.cancelChapterLoad) await savingPage.evaluate(() => document.querySelector('#r3-root').__readerLayout.seek(1));
        const settledPage = (await state()).reader.pagination.pageIndex;
        await touch(1); assert.equal((await state()).reader.pagination.pageIndex, settledPage + 1, 'settled Save/error DOM must accept a new swipe');
        await touch(-1); assert.equal((await state()).reader.pagination.pageIndex, settledPage);
        // Required physical QA sequence: after either persistence result, Settings then both directions.
        await savingPage.locator('[data-action="navigate"][data-route="settings.home"]').click();
        await savingPage.locator('[data-action="settings-return"]').click();
        await savingPage.waitForFunction(() => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === 'reader.canvas');
        const navigationBeforeTurns = await savingPage.evaluate(() => ({ history: { length: history.length, state: history.state },
          popstates: document.querySelector('#r3-root').__readerInteractionTrace?.snapshot().filter(event => event.event === 'POPSTATE').length }));
        const pageBefore = (await state()).reader.pagination.pageIndex;
        await touch(1); assert.equal((await state()).reader.pagination.pageIndex, pageBefore + 1);
        await touch(-1); assert.equal((await state()).reader.pagination.pageIndex, pageBefore);
        const navigation = await savingPage.evaluate(() => {
          const root = document.querySelector('#r3-root');
          return { routes: root.__readerInteractionTrace?.snapshot().filter(event => event.event === 'ROUTE_CHANGED').map(event => event.route),
            popstates: root.__readerInteractionTrace?.snapshot().filter(event => event.event === 'POPSTATE').length,
            history: { length: history.length, state: history.state }, session: root.__readerInteractionTrace?.snapshot().map(event => event.session) };
        });
        assert.deepEqual(navigation.routes, scenario.settingsDuringSave
          ? ['settings.home', 'reader.canvas', 'settings.home', 'reader.canvas'] : ['settings.home', 'reader.canvas']);
        assert.equal(navigationBeforeTurns.popstates, scenario.settingsDuringSave ? 2 : 1);
        assert.equal(navigation.popstates, navigationBeforeTurns.popstates); assert.deepEqual(navigation.history, navigationBeforeTurns.history);
        assert.equal(new Set(navigation.session).size, 1); assert.deepEqual(saveErrors, []);
      } finally { await cdp?.detach(); await savingPage.close(); }
    });
    await run('mounted chapter load Settings cancellation restores source and allows chapter-edge retry', async () => {
      const racing = await context.newPage();
      const raceErrors = []; racing.on('pageerror', error => raceErrors.push(error.message));
      try {
        await racing.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
        await racing.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
        const result = await racing.evaluate(async ({ bookId, releaseBeforeReturn }) => {
          const { bootstrapR3App } = await import('/pwa-reader/ui-r3/bootstrap.js');
          const { createR3Controller } = await import('/pwa-reader/ui-r3/controller.js');
          const { createR3Store } = await import('/pwa-reader/ui-r3/store.js');
          const { loadChapterContent } = await import('/pwa-reader/epubLoader.js');
          const storage = await import('/pwa-reader/storage.js');
          const oldRoot = document.querySelector('#r3-root'); oldRoot.__r3App.unsubscribe(); oldRoot.remove();
          const root = document.createElement('div'); root.id = 'r3-root'; document.body.appendChild(root);
          let block = false, enteredResolve, release;
          const entered = new Promise(resolve => enteredResolve = resolve);
          const held = new Promise(resolve => release = resolve);
          const store = createR3Store();
          const controller = createR3Controller({ store, waitForReaderTurn: () => root.__readerLayout?.waitForTurn(),
            readerRuntime: { async loadChapterContent(...args) {
              if (block) { enteredResolve(); await held; }
              return loadChapterContent(...args);
            } } });
          await bootstrapR3App({ document, root, store, controller });
          await controller.selectBook(bookId); await controller.selectReaderChapter(0);
          root.__readerLayout.seek(99999); await controller.flushReaderProgress();
          const before = (await storage.getReadingProgress(bookId)).logicalPosition;
          block = true;
          const turning = root.__readerLayout.turn(1);
          await Promise.race([entered, new Promise((_, reject) => setTimeout(() => reject(Error('Chapter load did not enter')), 3000))]);
          await controller.navigate('settings.home');
          if (releaseBeforeReturn) { release(); await turning; }
          await controller.returnFromSettings();
          const returned = store.getState();
          const after = (await storage.getReadingProgress(bookId)).logicalPosition;
          const retryPending = await root.__readerLayout.turn(-1);
          release(); const completed = await turning;
          await controller.flushReaderProgress();
          root.__readerLayout.seek(99999);
          const retry = await root.__readerLayout.turn(1); await controller.flushReaderProgress();
          return { completed, before, after, status: returned.reader.status, book: returned.activeBookId,
            chapter: returned.activeChapterId, retryPending, retry, nextChapter: store.getState().activeChapterId, trace: root.__readerInteractionTrace?.snapshot() };
        }, { bookId, releaseBeforeReturn: process.env.READER_QA_RELEASE_BEFORE_RETURN === '1' });
        assert.equal(result.completed, false); assert.equal(result.status, 'ready'); assert.equal(result.book, bookId);
        assert.equal(result.retryPending, true, 'retry must not await obsolete chapter I/O: ' + JSON.stringify(result.trace?.slice(-30)));
        assert.deepEqual(result.after, result.before); assert.equal(result.chapter, result.before.chapterId);
        assert.equal(result.retry, true); assert.notEqual(result.nextChapter, result.chapter);
        assert.deepEqual(raceErrors, []);
      } finally { await racing.close(); }
    });

    for (const lateAfterCommit of [false, true]) await run(
      "obsolete chapter completion cannot unlock or overwrite newer turn " + (lateAfterCommit ? "after commit" : "while pending"), async () => {
      const racing = await context.newPage();
      try {
        await racing.goto(origin + "/pwa-reader/r3.html?interactionTrace=1");
        await racing.waitForFunction(() => document.querySelector("#r3-root")?.__r3App?.store.getState().initialized);
        const result = await racing.evaluate(async ({bookId, lateAfterCommit}) => {
          const {bootstrapR3App} = await import("/pwa-reader/ui-r3/bootstrap.js");
          const {createR3Controller} = await import("/pwa-reader/ui-r3/controller.js");
          const {createR3Store} = await import("/pwa-reader/ui-r3/store.js");
          const {loadChapterContent} = await import("/pwa-reader/epubLoader.js");
          const storage = await import("/pwa-reader/storage.js");
          const old = document.querySelector("#r3-root"); old.__r3App.unsubscribe(); old.remove();
          const root = document.createElement("div"); root.id = "r3-root"; document.body.appendChild(root);
          const gates = [0, 1].map(() => { let release, enter, finish;
            return {held: new Promise(r => release=r), entered: new Promise(r => enter=r),
              finished: new Promise(r => finish=r), release: () => release(), enter: () => enter(), finish: () => finish()}; });
          let block=false, calls=0;
          const store=createR3Store();
          const controller=createR3Controller({store, waitForReaderTurn:()=>root.__readerLayout?.waitForTurn(),
            readerRuntime:{async loadChapterContent(...args) {
              const gate=block ? gates[calls++] : null;
              if (gate) { gate.enter(); await gate.held; }
              const loaded=await loadChapterContent(...args); gate?.finish(); return loaded;
            }}});
          await storage.saveReadingProgress({...await storage.getReadingProgress(bookId),bookKey:bookId,chapterIndex:0,chapterId:null,currentChapterIndex:0,currentChapterId:null,logicalPosition:null,scrollRatio:0,scrollTop:0});
          await bootstrapR3App({document,root,store,controller});
          await controller.selectBook(bookId); await controller.selectReaderChapter(0);
          root.__readerLayout.seek(99999); await controller.flushReaderProgress();
          const source=(await storage.getReadingProgress(bookId)).logicalPosition;
          block=true; const obsolete=root.__readerLayout.turn(1); await Promise.race([gates[0].entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('old chapter load did not enter')),3000))]);
          await controller.navigate("settings.home"); root.__readerHistory.backFromSettings();
          await new Promise(resolve=>setTimeout(resolve,50)); await root.__readerHistory.whenSettled();
          const cancelled=await obsolete;
          const restored=(await storage.getReadingProgress(bookId)).logicalPosition;
          const newer=root.__readerLayout.turn(1); await Promise.race([gates[1].entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('new chapter load did not enter')),3000))]);
          let rejectedWhilePending=null;
          if (!lateAfterCommit) {
            gates[0].release(); await gates[0].finished; await new Promise(resolve=>setTimeout(resolve,30));
            rejectedWhilePending=await root.__readerLayout.turn(-1);
          }
          const whilePending={status:store.getState().reader.status,chapter:store.getState().activeChapterId,
            rejection:root.__readerInteractionTrace?.snapshot().filter(event=>event.event==='TURN_REJECTED').at(-1)?.reason};
          gates[1].release(); const committed=await newer; await controller.flushReaderProgress();
          const afterNew=store.getState(), anchor=(await storage.getReadingProgress(bookId)).logicalPosition;
          const committedContent=root.querySelector(".r3-reader-content"),html=committedContent.innerHTML;
          if (lateAfterCommit) { gates[0].release(); await gates[0].finished; await new Promise(resolve=>setTimeout(resolve,30)); }
          await controller.flushReaderProgress();
          const afterOld={chapter:store.getState().activeChapterId,route:store.getState().activeScreen,
            position:(await storage.getReadingProgress(bookId)).logicalPosition,
            sameDOM:committedContent===root.querySelector(".r3-reader-content") && html===committedContent.innerHTML};
          const historyBefore={length:history.length,state:history.state};
          const next=await root.__readerLayout.turn(1), previous=await root.__readerLayout.turn(-1);
          return {cancelled,restored,source,committed,rejectedWhilePending,whilePending,
            chapter:afterNew.activeChapterId,anchor,afterOld,next,previous,calls,
            historyBefore,historyAfter:{length:history.length,state:history.state}};
        }, {bookId,lateAfterCommit});
        assert.equal(result.cancelled,false); assert.deepEqual(result.restored,result.source);
        assert.equal(result.whilePending.status,"loading"); assert.equal(result.whilePending.chapter,result.source.chapterId);
        if (!lateAfterCommit) {
          assert.equal(result.rejectedWhilePending,false,"obsolete finally must not release newer owner");
          assert.equal(result.whilePending.rejection,'chapter-changing','newer transaction must retain ownership');
        }
        assert.equal(result.committed,true); assert.notEqual(result.chapter,result.source.chapterId);
        assert.deepEqual(result.afterOld,{chapter:result.chapter,route:"reader.canvas",position:result.anchor,sameDOM:true});
        assert.equal(result.calls,2); assert.equal(result.next,true); assert.equal(result.previous,true);
        assert.deepEqual(result.historyAfter,result.historyBefore);
      } finally {await racing.close();}
    });
    const registeredOrigins = await page.evaluate(async () => Object.values((await import('/pwa-reader/ui-r3/routes.js')).R3_ROUTES).filter(route => !route.startsWith('settings.')));
    for (const originRoute of registeredOrigins) for (const native of [true, false]) await run(
      `mounted Settings ${native ? 'native Back' : 'Return'} restores ${originRoute} through nested screens and Forward`, async () => {
      const navigating = await context.newPage();
      const errors = []; navigating.on('pageerror', error => errors.push(error.message));
      try {
        await navigating.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
        await navigating.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
        const before = await navigating.evaluate(async ({ bookId, originRoute }) => {
          const root = document.querySelector('#r3-root'), app = root.__r3App;
          const { r3Actions } = await import('/pwa-reader/ui-r3/actions.js');
          if (originRoute === 'reader.canvas') {
            await app.controller.selectBook((await import('/pwa-reader/guideBook.js')).GUIDE_BOOK_KEY);
            await app.controller.selectBook(bookId); root.__readerLayout.seek(2); await app.controller.flushReaderProgress();
          } else {
            await app.controller.navigate(originRoute);
            if (originRoute === 'shell.library') {
              const books = app.store.getState().books;
              app.store.dispatch(r3Actions.loadBooksSuccess(Array.from({ length: 18 }, (_, i) => ({ ...books[0], bookKey: 'qa-origin-' + i }))));
            }
            if (originRoute === 'shell.vocabulary') app.store.dispatch(r3Actions.setVocabularyState({ activeTab: 'learning', searchQuery: 'quiet' }));
          }
          const main = root.querySelector('.r3-main'); if (main) main.scrollTop = 120;
          const state = app.store.getState();
          const position = originRoute === 'reader.canvas' ? (await (await import('/pwa-reader/storage.js')).getReadingProgress(bookId)).logicalPosition : null;
          return { route: state.activeScreen, book: state.activeBookId, chapter: state.activeChapterId, position,
            library: state.library, vocabulary: state.vocabulary, main: main?.scrollTop || 0,
            session: root.__readerInteractionTrace?.snapshot().at(-1)?.session, length: history.length };
        }, { bookId, originRoute });
        await navigating.evaluate(async () => {
          const app = document.querySelector('#r3-root').__r3App;
          await app.controller.navigate('settings.home'); await app.controller.navigate('settings.language');
          await app.controller.setUiLanguage('zh-CN'); await app.controller.navigate('settings.appearance');
        });
        assert.equal(await navigating.evaluate(() => history.length), before.length + 1, 'nested Settings must share one owned slot');
        if (native) await navigating.evaluate(() => history.back());
        else await navigating.locator('[data-action="settings-return"]').click();
        await navigating.waitForFunction(route => document.querySelector('#r3-root').__r3App.store.getState().activeScreen === route, originRoute);
        const snapshot = () => navigating.evaluate(async ({ bookId, originRoute }) => {
          const root = document.querySelector('#r3-root'), state = root.__r3App.store.getState();
          await root.__r3App.controller.flushReaderProgress();
          return { route: state.activeScreen, book: state.activeBookId, chapter: state.activeChapterId,
            position: originRoute === 'reader.canvas' ? (await (await import('/pwa-reader/storage.js')).getReadingProgress(bookId)).logicalPosition : null,
            library: state.library, vocabulary: state.vocabulary, main: root.querySelector('.r3-main')?.scrollTop || 0,
            session: root.__readerInteractionTrace?.snapshot().at(-1)?.session, length: history.length };
        }, { bookId, originRoute });
        const after = await snapshot(); assert.deepEqual({ ...after, length: before.length }, before);
        await navigating.evaluate(() => history.forward()); await navigating.waitForTimeout(80);
        assert.deepEqual(await snapshot(), after, 'Forward must restore the origin without resurfacing Settings');
        if (originRoute === 'reader.canvas') {
          const result = await navigating.evaluate(async () => {
            const root = document.querySelector('#r3-root'), before = { length: history.length, state: history.state };
            const first = root.__readerLayout.turn(1), busy = await root.__readerLayout.turn(-1);
            const next = await first, previous = await root.__readerLayout.turn(-1);
            return { next, previous, busy, before, after: { length: history.length, state: history.state }, route: root.__r3App.store.getState().activeScreen };
          });
          assert.equal(result.next, true); assert.equal(result.previous, true); assert.equal(result.busy, false);
          assert.equal(result.route, 'reader.canvas'); assert.deepEqual(result.after, result.before);
        }
        assert.deepEqual(errors, []);
      } finally { await navigating.close(); }
    });
    await run('mounted legacy Settings Forward entry is consumed without route resurrection', async () => {
      const legacy = await context.newPage();
      try {
        await legacy.goto(origin + '/pwa-reader/r3.html?interactionTrace=1');
        await legacy.waitForFunction(() => document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
        await legacy.evaluate(async bookId => {
          await document.querySelector('#r3-root').__r3App.controller.selectBook(bookId);
          history.pushState({ interleafR3: { screen: 'settings.language' } }, ''); history.back();
        }, bookId);
        await legacy.waitForTimeout(50); await legacy.evaluate(() => history.forward()); await legacy.waitForTimeout(50);
        const result = await legacy.evaluate(() => ({ route: document.querySelector('#r3-root').__r3App.store.getState().activeScreen,
          book: document.querySelector('#r3-root').__r3App.store.getState().activeBookId, entry: history.state.interleafR3,
          routes: document.querySelector('#r3-root').__readerInteractionTrace.snapshot().filter(e => e.event === 'ROUTE_CHANGED').map(e => e.route) }));
        assert.equal(result.route, 'reader.canvas'); assert.equal(result.book, bookId); assert.equal(result.entry.screen, 'reader.canvas');
        assert.ok(!result.routes.includes('settings.language'));
      } finally { await legacy.close(); }
    });
    assert.deepEqual(errors, []);
    await fs.mkdir(path.join(root, 'generated/r4-safari-qa'), { recursive: true });
    const label = (process.env.READER_QA_BASELINE === '1' ? 'baseline' : process.env.READER_QA_ENGINE || 'edge')
      + (process.env.READER_QA_RELEASE_BEFORE_RETURN === '1' ? '-before-return' : '');
    await fs.writeFile(path.join(root, 'generated/r4-safari-qa', label + '.json'), JSON.stringify(results, null, 2));
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
