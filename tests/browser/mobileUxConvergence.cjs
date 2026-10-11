// Run: NODE_PATH=<bundled node_modules> node tests/browser/mobileUxConvergence.cjs
// All books are generated from authored, copyright-safe fixture text.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const JSZip = require('../../pwa-reader/vendor/jszip-3.10.1/jszip.min.js');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'generated/mobile-ux-qa');
async function epub(chapters, title) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OPS/book.opf', `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">authored-mobile-qa</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>${chapters.map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
  zip.file('OPS/nav.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="c${i}.xhtml">${c.title}</a></li>`).join('')}</ol></nav></body></html>`);
  chapters.forEach((c, i) => zip.file(`OPS/c${i}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${c.title}</title></head><body>${c.body}</body></html>`));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}


const prose = Array.from({length: 70}, (_, i) => `<p>Garden ${i}. A visitor will mutter beside the <em>quiet</em> river. Marigold and sundial mark the path. The winding path leads to a small bridge and sunlight warms the water. We continue through the garden to watch birds return.</p>`).join('');
async function main() {
 await fs.mkdir(output, {recursive:true});
 const fixtures = {};
 for (const name of ['a','b']) fixtures['/qa/'+name+'.epub'] = await epub([
  {title:'Cover',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="teal"/></svg>'},
  {title:'Empty',body:'<div> </div>'},
  ...Array.from({length:5},(_,i)=>({title:'Garden '+i,body:'<h1>Garden</h1>'+prose}))
 ], 'Authored convergence '+name);
 fixtures['/data/dictionary/qa-safe/manifest.json']=Buffer.from('{"fixture":"authored manifest"}');
 fixtures['/data/dictionary/qa-safe/shards/ga.json']=Buffer.from('{"fixture":"authored shard"}');
 fixtures['/qa/smoke.epub']=await fs.readFile(path.join(root,'tests/fixtures/interleaf_smoke.epub'));
 const server = http.createServer(async(req,res)=>{
  try {
   const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file = path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   assert.ok(file.startsWith(root+path.sep));
   const body = fixtures[pathname] || await fs.readFile(file);
   res.setHeader('Content-Type',({js:'text/javascript',mjs:'text/javascript',css:'text/css',html:'text/html',json:'application/json',epub:'application/epub+zip',svg:'image/svg+xml'})[file.split('.').pop()] || 'application/octet-stream');
   res.end(body);
  } catch {res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin = 'http://127.0.0.1:'+server.address().port;
 const browser = await chromium.launch({channel:process.env.READER_QA_CHANNEL || 'msedge',headless:true,args:['--no-proxy-server']});
 const results = [];
 try {
 for (const [label,viewport] of [['mobile',{width:393,height:852}],['desktop',{width:1365,height:900}]]) {
  const context = await browser.newContext({viewport,hasTouch:label==='mobile',isMobile:label==='mobile'});
  const page = await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/pwa-reader/r3.html');
  await page.waitForFunction(()=>document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
  await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
  const importBook = name => page.evaluate(async name=>{
   const app=document.querySelector('#r3-root').__r3App;
   const blob=await (await fetch('/qa/'+name+'.epub')).blob();
   await app.controller.importBook(new File([blob],name+'.epub',{type:'application/epub+zip',lastModified:1}));
   const id=app.store.getState().importStatus.lastImportedBookKey;
   await app.controller.selectBook(id);return id;
  },name);
  const clickHit=async()=>{
   const point=await page.evaluate(()=>{
    for(const hit of document.querySelectorAll('.vocab-hit')) {
     const r=hit.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
     if(x>12 && x<innerWidth-12 && y>110 && y<innerHeight-150 && hit.contains(document.elementFromPoint(x,y))) return {x,y};
    }
    throw Error('No unobscured vocabulary hit on current page');
   });
   await page.mouse.click(point.x,point.y);
  };
  const a=await importBook('a');
  const run=async(name,fn)=>{await fn();results.push({label,name,passed:true});console.log('PASS '+label+' '+name);};
  await page.evaluate(async()=>{await document.querySelector('#r3-root').__r3App.controller.selectReaderChapter(2);await document.fonts.ready;});
  await page.waitForTimeout(120);
  await run('1 optimistic Save and authoritative refresh during Page animation',async()=>{
   const result=await page.evaluate(async()=>{
    const root=document.querySelector('#r3-root'),app=root.__r3App;
    root.__readerLayout.seek(0);
    const content=root.querySelector('.r3-reader-content');
    const text=content.querySelector('p').firstChild;
    const start=text.textContent.indexOf('visitor');
    const range=document.createRange();range.setStart(text,start);range.setEnd(text,start+7);
    document.getSelection().removeAllRanges();document.getSelection().addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise(requestAnimationFrame);
    const done=root.__readerLayout.turn(1);
    await new Promise(r=>setTimeout(r,35));
    root.querySelector('[data-action="reader-selection-save"]').click();
    const same=content===root.querySelector('.r3-reader-content');
    const underline=content.querySelector('.r3-vocabulary-pending')?.textContent;
    const optimistic=app.store.getState().reader.learningWords.includes('visitor');
    const completed=await done;
    while(app.store.getState().reader.vocabularySaving) await new Promise(r=>setTimeout(r,5));
    document.getSelection().removeAllRanges();
    await app.controller.flushReaderProgress();
    const {getReadingProgress}=await import('/pwa-reader/storage.js');
    return {same,underline,optimistic,completed,page:app.store.getState().reader.pagination.pageIndex,progress:await getReadingProgress(app.store.getState().activeBookId)};
   });
   assert.equal(result.same,true);assert.equal(result.underline,'visitor');assert.equal(result.optimistic,true);assert.equal(result.completed,true,'vocabulary refresh must not cancel turn');
   assert.equal(result.page,1);assert.ok(result.progress.logicalPosition.textOffset>0);
  });

  const read = () => page.evaluate(()=>document.querySelector('#r3-root').__r3App.store.getState());
  const saved = id => page.evaluate(async id=>(await import('/pwa-reader/storage.js')).getReadingProgress(id),id);
  const flush = () => page.evaluate(async()=>document.querySelector('#r3-root').__r3App.controller.flushReaderProgress());
  await run('2 Save on a chapter-edge turn',async()=>{
   const result=await page.evaluate(async()=>{
    const root=document.querySelector('#r3-root'),app=root.__r3App;
    root.__readerLayout.seek(99999);
    const done=root.__readerLayout.turn(1);
    await new Promise(r=>setTimeout(r,30));
    const save=app.controller.setReaderVocabularyState('learning','river');
    const [completed]=await Promise.all([done,save]);
    await app.controller.flushReaderProgress();
    return {completed,state:app.store.getState()};
   });
   assert.equal(result.completed,true);assert.equal(result.state.reader.chapterIndex,3);
   assert.equal(result.state.reader.pagination.pageIndex,0);assert.equal(result.state.reader.vocabularySaving,false);
   assert.ok(result.state.reader.learningWords.includes('river'));
   assert.equal((await saved(a)).logicalPosition.chapterId,result.state.activeChapterId);
  });
  await run('3 deferred Preview invalidated by chapter change and cache eviction',async()=>{
   await page.evaluate(async()=>{
    const app=document.querySelector('#r3-root').__r3App;window.qaPreviewScans=0;
    app.controller.openVocabularyPreview(()=>{window.qaPreviewScans++;return {};},{defer:true});
    for (const index of [4,5,6,2]) await app.controller.selectReaderChapter(index);
   });
   await page.waitForTimeout(60);
   assert.equal(await page.evaluate(()=>window.qaPreviewScans),0);
   assert.equal((await read()).reader.vocabularyPreview,null);assert.equal((await read()).openOverlay,null);
   assert.equal((await read()).reader.pagination.status,'ready');
  });
  await run('4 close Preview before preparation completes',async()=>{
   await page.evaluate(()=>{
    const app=document.querySelector('#r3-root').__r3App;window.qaPreviewScans=0;
    app.controller.openVocabularyPreview(()=>{window.qaPreviewScans++;return {};},{defer:true});
    if (!app.store.getState().reader.vocabularyPreview.loading) throw Error('Preview did not open immediately');
    app.controller.closeVocabularyPreview();
   });
   await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.qaPreviewScans),0);
   assert.equal((await read()).reader.vocabularyPreview,null);
  });
  await run('5 Passage detour swipe cross-chapter Return and Continue',async()=>{
   await page.evaluate(async()=>{const root=document.querySelector('#r3-root');root.__readerLayout.seek(2);await root.__r3App.controller.flushReaderProgress();});
   const originAnchor=(await saved(a)).logicalPosition;
   await page.locator('[data-action="vocabulary-preview-open"]').click();
   await page.waitForFunction(()=>document.querySelector('#r3-root').__r3App.store.getState().reader.vocabularyPreview?.loading===false);
   const occurrence=await page.evaluate(()=>document.querySelector('#r3-root').__r3App.store.getState().reader.vocabularyPreview.rows.find(row=>row.term==='visitor')?.occurrences[0]);
   assert.ok(Number.isInteger(occurrence?.textOffset));
   await page.evaluate(()=>document.querySelector('#r3-root').__r3App.controller.goToVocabularyPreviewOccurrence('visitor',0));
   await page.waitForFunction(()=>document.querySelector('#r3-root').__r3App.store.getState().reader.passageReturn);
   if(label==='mobile') {
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:400}]});
    for (const x of [270,230,190,150]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:402}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   } else await page.locator('.r3-reader-scroll').press('ArrowRight');
   await page.waitForFunction(()=>document.querySelector('#r3-root').__r3App.store.getState().reader.pagination.pageIndex===1);
   await page.evaluate(async()=>{const root=document.querySelector('#r3-root');root.__readerLayout.seek(99999);await root.__readerLayout.turn(1);await root.__r3App.controller.flushReaderProgress();});
   assert.equal((await read()).reader.chapterIndex,3);assert.deepEqual((await saved(a)).logicalPosition,originAnchor);
   await page.locator('[data-action="reader-return-position"]').click();
   await page.waitForFunction(()=>!document.querySelector('#r3-root').__r3App.store.getState().reader.passageReturn);
   await flush();assert.deepEqual((await saved(a)).logicalPosition,originAnchor);
   await page.evaluate(async()=>{
    const app=document.querySelector('#r3-root').__r3App;
    await app.controller.startPassageDetour({chapterId:app.store.getState().reader.toc[3]?.id || app.store.getState().activeChapterId,textOffset:17});
    await app.controller.selectReaderChapter(4);
   });
   await flush();assert.deepEqual((await saved(a)).logicalPosition,originAnchor);
   await page.locator('[data-action="reader-continue-here"]').click();await flush();
   assert.equal((await saved(a)).logicalPosition.chapterId,(await read()).activeChapterId);
   assert.notDeepEqual((await saved(a)).logicalPosition,originAnchor);
  });
  let bookmarkAnchor;
  await run('6 bookmark seek followed by Page Scroll appearance repagination',async()=>{
   await page.evaluate(async()=>{const root=document.querySelector('#r3-root');root.__readerLayout.seek(2);await root.__r3App.controller.flushReaderProgress();await root.__r3App.controller.toggleReaderBookmark();});
   bookmarkAnchor=(await saved(a)).logicalPosition;
   const bookmark=(await read()).reader.bookmarks.find(b=>b.chapterId===bookmarkAnchor.chapterId && b.textOffset===bookmarkAnchor.textOffset);
   assert.ok(bookmark);assert.equal('pageIndex' in bookmark,false);
   await page.evaluate(async id=>{const root=document.querySelector('#r3-root');root.__readerLayout.seek(0);await root.__r3App.controller.seekReaderBookmark(id);await root.__r3App.controller.setReaderAppearance({fontSize:'xl',margin:'wide'});await root.__r3App.controller.setReadingLayout('scroll');await root.__r3App.controller.setReadingLayout('page');await root.__r3App.controller.flushReaderProgress();},bookmark.id);
   assert.deepEqual((await saved(a)).logicalPosition,bookmarkAnchor);
   assert.equal((await read()).reader.bookmarkActive,true);
  });
  await run('7 media-only and empty EPUB bookmarks',async()=>{
   for(const [index,kind] of [[0,'media'],[1,'empty']]) {
    await page.evaluate(async index=>{const app=document.querySelector('#r3-root').__r3App;await app.controller.selectReaderChapter(index);await app.controller.toggleReaderBookmark();},index);
    const state=await read();assert.equal(state.reader.contentKind,kind);assert.equal(state.reader.status,'ready');
    assert.ok(state.reader.bookmarks.some(b=>b.chapterId===state.activeChapterId && b.textOffset===0));
    assert.equal(state.reader.pagination.status,'ready');
   }
  });
  const b=await importBook('b');
  await run('8 Reader A Reader B Settings language Back',async()=>{
   await page.evaluate(async({a,b})=>{
    const root=document.querySelector('#r3-root'),app=root.__r3App;
    await app.controller.selectBook(a);await app.controller.selectBook(b);await app.controller.selectReaderChapter(2);root.__readerLayout.seek(1);await app.controller.flushReaderProgress();
   },{a,b});
   const before=(await saved(b)).logicalPosition;
   await page.locator('[data-action="navigate"][data-route="settings.home"]').click();
   await page.locator('[data-action="set-ui-language"][data-ui-language="zh-CN"]').click();
   await page.locator('[data-action="settings-return"]').click();
   await page.waitForFunction(()=>document.querySelector('#r3-root').__r3App.store.getState().activeScreen==='reader.canvas');
   await flush();const state=await read();assert.equal(state.activeBookId,b);assert.equal(state.settings.uiLanguage,'zh-CN');
   assert.deepEqual((await saved(b)).logicalPosition,before);assert.equal(state.activeReadingMode,'english-study');
   await page.evaluate(async()=>document.querySelector('#r3-root').__r3App.controller.setUiLanguage('en'));
  });
  await run('9 chrome toggle with bubble and pending Save',async()=>{
   await page.evaluate(async()=>document.querySelector('#r3-root').__r3App.controller.setReaderAppearance({fontSize:'md',margin:'normal'}));
   await clickHit();
   assert.ok((await read()).reader.vocabularyBubble);
   const result=await page.evaluate(async()=>{
    const root=document.querySelector('#r3-root'),app=root.__r3App;
    const before=app.store.getState().reader.chromeVisible;
    app.controller.toggleReaderChrome();
    const blocked=app.store.getState().reader.chromeVisible===before;
    app.controller.closeVocabularyBubble();
    const content=root.querySelector('.r3-reader-content');
    const saving=app.controller.setReaderVocabularyState('learning','visitor');
    app.controller.toggleReaderChrome();
    const same=content===root.querySelector('.r3-reader-content');
    const toggled=app.store.getState().reader.chromeVisible!==before;
    await saving;return {blocked,same,toggled,saving:app.store.getState().reader.vocabularySaving};
   });
   assert.deepEqual(result,{blocked:true,same:true,toggled:true,saving:false});
   await page.evaluate(()=>document.querySelector('#r3-root').__r3App.controller.toggleReaderChrome());
  });
  await run('10 Guide authored modes pagination and vocabulary assistance',async()=>{
   await page.evaluate(async()=>{const app=document.querySelector('#r3-root').__r3App;await app.controller.openGuide();await app.controller.selectReaderChapter(3);});
   for(const mode of ['chinese','cloze-mixed','english-study']) {
    await page.evaluate(async mode=>document.querySelector('#r3-root').__r3App.controller.setReaderMode(mode),mode);
    const state=await read();assert.equal(state.reader.effectiveMode,mode);assert.equal(state.reader.pagination.status,'ready');assert.equal(state.reader.pagination.scope,'chapter');
   }
   assert.ok(await page.locator('.vocab-hit').count());
   await clickHit();assert.ok((await read()).reader.vocabularyBubble);
   await page.evaluate(()=>document.querySelector('#r3-root').__r3App.controller.closeVocabularyBubble());
  });
  await run('11 rapid turns cancellation logical-position consistency',async()=>{
   await page.evaluate(async b=>{const root=document.querySelector('#r3-root');await root.__r3App.controller.selectBook(b);await root.__r3App.controller.selectReaderChapter(2);root.__readerLayout.seek(0);},b);
   const result=await page.evaluate(async()=>{
    const root=document.querySelector('#r3-root'),app=root.__r3App;
    const rapid=await Promise.all([root.__readerLayout.turn(1),root.__readerLayout.turn(1),root.__readerLayout.turn(-1)]);
    await app.controller.flushReaderProgress();
    const {getReadingProgress}=await import('/pwa-reader/storage.js');const before=(await getReadingProgress(app.store.getState().activeBookId)).logicalPosition;
    const done=root.__readerLayout.turn(1);await new Promise(r=>setTimeout(r,35));app.controller.openReaderContents();const canceled=await done;
    app.controller.closeOverlay();await app.controller.flushReaderProgress();
    return {rapid,canceled,before,after:(await getReadingProgress(app.store.getState().activeBookId)).logicalPosition,page:app.store.getState().reader.pagination.pageIndex};
   });
   assert.deepEqual(result.rapid,[true,false,false]);assert.equal(result.canceled,false);assert.equal(result.page,1);assert.deepEqual(result.before,result.after);
  });
  await run('12 reload navigation bookmark Save without cross-book leakage',async()=>{
   await page.evaluate(async a=>document.querySelector('#r3-root').__r3App.controller.selectBook(a),a);
   const mark=(await read()).reader.bookmarks.find(b=>b.chapterId===bookmarkAnchor.chapterId && b.textOffset===bookmarkAnchor.textOffset);
   await page.evaluate(async id=>{const app=document.querySelector('#r3-root').__r3App;await app.controller.seekReaderBookmark(id);await app.controller.setReaderVocabularyState('learning','garden');await app.controller.flushReaderProgress();},mark.id);
   const before=(await saved(a)).logicalPosition;
   await page.reload();await page.waitForFunction(()=>document.querySelector('#r3-root')?.__r3App?.store.getState().reader.status==='ready');
   await flush();let state=await read();assert.equal(state.activeBookId,a);assert.deepEqual((await saved(a)).logicalPosition,before);
   assert.ok(state.reader.learningWords.includes('garden'));assert.ok(state.reader.bookmarks.some(item=>item.id===mark.id));
   await page.evaluate(async b=>document.querySelector('#r3-root').__r3App.controller.selectBook(b),b);
   state=await read();assert.equal(state.activeBookId,b);assert.equal(state.reader.bookmarks.length,0);assert.ok(state.reader.learningWords.includes('garden'),'vocabulary stays global');assert.equal(state.reader.passageReturn,false);
  });

  await run('15 one Save completion preserves another pending native selection',async()=>{
   await page.evaluate(async b=>{
    const previous=document.querySelector('#r3-root');previous.__r3App.unsubscribe();
    const root=document.createElement('main');root.id='r3-root';root.className='r3-root';previous.replaceWith(root);
    const vocabulary=await import('/pwa-reader/adapters/vocabularyAdapter.js');
    window.qaWriteReleases=[];window.qaWriteCount=0;
    const {bootstrapR3App}=await import('/pwa-reader/ui-r3/bootstrap.js');
    const app=await bootstrapR3App({document,adapters:{vocabulary:{...vocabulary,setTermState:async(...args)=>{
     window.qaWriteCount++;await new Promise(resolve=>window.qaWriteReleases.push(resolve));return vocabulary.setTermState(...args);
    }}}});
    await app.controller.selectBook(b);await app.controller.selectReaderChapter(2);root.__readerLayout.seek(0);
    for(const term of ['marigold','sundial']) {
     const content=root.querySelector('.r3-reader-content'),walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);let node;
     while((node=walker.nextNode())){const start=node.textContent.toLowerCase().indexOf(term);if(start<0)continue;const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+term.length);document.getSelection().removeAllRanges();document.getSelection().addRange(range);break;}
     document.dispatchEvent(new Event('selectionchange'));await new Promise(requestAnimationFrame);root.querySelector('[data-action="reader-selection-save"]').click();
    }
    document.getSelection().removeAllRanges();
   },b);
   await page.waitForFunction(()=>window.qaWriteReleases.length===1);
   await page.evaluate(()=>window.qaWriteReleases.shift()());
   await page.waitForFunction(()=>window.qaWriteCount===2);
   const pending=await page.locator('.r3-vocabulary-pending').allTextContents();
   assert.ok(pending.some(text=>text.toLowerCase()==='sundial'),'second native selection must remain underlined while its write is pending');
   await page.evaluate(()=>window.qaWriteReleases.shift()());
   await page.waitForFunction(()=>!document.querySelector('#r3-root').__r3App.store.getState().reader.vocabularySaving);
   const words=(await read()).reader.learningWords;assert.ok(words.includes('marigold'));assert.ok(words.includes('sundial'));
  });
  await run('13 Service Worker R3 offline reload dependency closure and lazy dictionary cache',async()=>{
   await page.evaluate(async()=>navigator.serviceWorker.ready);
   await flush();const before=(await saved(b)).logicalPosition;
   await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller && document.querySelector('#r3-root')?.__r3App?.store.getState().reader.status==='ready');
   const cache=await page.evaluate(async()=>{
    const names=await caches.keys(),bucket=await caches.open('interleaf-reader-static-v9');
    const paths=(await bucket.keys()).map(req=>new URL(req.url).pathname);
    await fetch('/data/dictionary/qa-safe/manifest.json');await fetch('/data/dictionary/qa-safe/shards/ga.json');
    const dictionary=await caches.open('interleaf-reader-dictionary-metadata-v1');
    return {names,paths,dictionary:(await dictionary.keys()).map(req=>new URL(req.url).pathname)};
   });
   assert.ok(cache.names.includes('interleaf-reader-static-v9'));assert.ok(!cache.names.includes('interleaf-reader-static-v5'));
   for(const path of ['/pwa-reader/r3.html','/pwa-reader/readerBookmarks.js','/pwa-reader/ui-r3/readerPageTurn.js']) assert.ok(cache.paths.includes(path),path);
   assert.ok(!cache.paths.some(path=>path.includes('/data/dictionary/') || path.endsWith('.epub')));
   assert.ok(cache.dictionary.includes('/data/dictionary/qa-safe/shards/ga.json'));
   await context.setOffline(true);
   const offline=await page.evaluate(async()=>({cached:(await fetch('/data/dictionary/qa-safe/shards/ga.json')).status,missing:(await fetch('/data/dictionary/qa-safe/shards/zz.json')).status}));
   assert.deepEqual(offline,{cached:200,missing:504});
   await page.reload();await page.waitForFunction(()=>document.querySelector('#r3-root')?.__r3App?.store.getState().reader.status==='ready');
   await flush();assert.equal((await read()).activeBookId,b);assert.deepEqual((await saved(b)).logicalPosition,before);
   await page.evaluate(async a=>{const app=document.querySelector('#r3-root').__r3App;await app.controller.selectBook(a);await app.controller.seekReaderBookmark(app.store.getState().reader.bookmarks[0].id);await app.controller.openGuide();},a);
   assert.equal((await read()).reader.status,'ready');assert.equal((await read()).reader.pagination.status,'ready');
   await context.setOffline(false);
  });
  await page.screenshot({path:path.join(output,label+'-reader.png')});

  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

  await run('14 repository authored smoke EPUB import first chapter and persistence',async()=>{
   const smoke=await importBook('smoke');const state=await read();
   assert.equal(state.reader.status,'ready');assert.ok(state.activeChapterId);await flush();
   assert.equal((await saved(smoke)).logicalPosition.chapterId,state.activeChapterId);
  });
  assert.deepEqual(errors,[]);await context.close();
 }
 // Update boundary: an old active worker must wait for its clients to close.
 const previousWorker=require('node:child_process').execFileSync('git',['-C',root,'show','378cca427363903e8cae5134023a483af29e80b0:pwa-reader/sw.js']);
 fixtures['/pwa-reader/sw.js']=previousWorker;
 const upgradeContext=await browser.newContext({viewport:{width:393,height:852}});
 let upgradePage=await upgradeContext.newPage();
 await upgradePage.goto(origin+'/pwa-reader/r3.html');
 await upgradePage.evaluate(async()=>navigator.serviceWorker.ready);
 await upgradePage.reload();await upgradePage.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.ok(await upgradePage.evaluate(async()=>(await caches.keys()).includes('interleaf-reader-static-v5')));
 delete fixtures['/pwa-reader/sw.js'];
 const waiting=await upgradePage.evaluate(async()=>{
  const registration=await navigator.serviceWorker.getRegistration();await registration.update();
  for(let i=0;i<150;i++){
   if(registration.waiting?.state==='installed')return {waiting:registration.waiting.state,keys:await caches.keys()};
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  throw Error('v9 did not enter waiting while v5 client remained open');
 });
 assert.ok(waiting.keys.includes('interleaf-reader-static-v5'));assert.ok(waiting.keys.includes('interleaf-reader-static-v9'));assert.equal(waiting.waiting,'installed');
 await upgradePage.close();
 upgradePage=await upgradeContext.newPage();await upgradePage.goto(origin+'/pwa-reader/r3.html');
 await upgradePage.evaluate(async()=>{
  for(let i=0;i<150;i++){if(!(await caches.keys()).includes('interleaf-reader-static-v5'))return;await new Promise(resolve=>setTimeout(resolve,20));}
  throw Error('v5 cache was not retired after its client closed');
 });
 assert.ok(await upgradePage.evaluate(async()=>(await caches.keys()).includes('interleaf-reader-static-v9')));
 await upgradeContext.setOffline(true);await upgradePage.reload();
 await upgradePage.waitForFunction(()=>document.querySelector('#r3-root')?.__r3App?.store.getState().initialized);
 await upgradeContext.close();results.push({label:'update',name:'v5 active -> v9 waiting -> close clients -> v9 offline R3',passed:true});
 console.log('PASS update v5 waiting activation and offline R3');
 await fs.writeFile(path.join(output,'convergence.json'),JSON.stringify(results,null,2));
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
