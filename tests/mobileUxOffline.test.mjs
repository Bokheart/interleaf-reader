import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const pwa = new URL('../pwa-reader/', import.meta.url);
const source = await readFile(new URL('sw.js',pwa),'utf8');
const assets = new Set([...source.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>new URL(m[1],pwa).href));

test('R3 offline manifest covers the complete mounted runtime module graph and styles', async()=>{
 const visited=new Set();
 async function visit(url) {
  if(visited.has(url.href))return;visited.add(url.href);
  assert.ok(assets.has(url.href),'Missing offline runtime: '+url.pathname);
  const text=await readFile(url,'utf8');
  for(const match of text.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) await visit(new URL(match[1],url));
 }
 await visit(new URL('ui-r3/bootstrap.js',pwa));
 for(const file of ['r3.html','ui-r3/styles/base.css','ui-r3/styles/tokens.css','ui-r3/styles/reader-content.css']) assert.ok(assets.has(new URL(file,pwa).href),file);
 assert.ok(assets.has(new URL('ui-r3/readerPageTurn.js',pwa).href));
 assert.ok(assets.has(new URL('readerBookmarks.js',pwa).href));
 assert.ok(![...assets].some(url=>url.includes('/data/dictionary/')));
 assert.match(source,/interleaf-reader-static-v6/);
});

test('offline R3 navigation returns R3 while Legacy retains its own fallback',async()=>{
 const handlers={};const matched=[];
 vm.runInNewContext(source,{URL,Response,console,
  self:{registration:{scope:'https://reader.test/pwa-reader/'},addEventListener:(type,fn)=>handlers[type]=fn},
  location:{origin:'https://reader.test'},
  fetch:async()=>{throw Error('offline')},
  caches:{match:async key=>{matched.push(key);return new Response(key)}}});
 for(const [path,expected] of [['r3.html','./r3.html'],['index.html','./index.html']]){
  let pending;handlers.fetch({request:{url:'https://reader.test/pwa-reader/'+path,method:'GET',mode:'navigate',headers:new Headers()},respondWith:p=>pending=p});
  assert.equal(await (await pending).text(),expected);
 }
 assert.deepEqual(matched,['./r3.html','./index.html']);
});
