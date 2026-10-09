import test from "node:test";
import assert from "node:assert/strict";
import * as layout from "../pwa-reader/ui-r3/readerLayout.js";
import {readFile} from "node:fs/promises";

test("current chapter pagination is usable without enumerating or measuring other chapters", async () => {
 const source=await readFile(new URL("../pwa-reader/ui-r3/readerLayout.js",import.meta.url),"utf8");
 assert.doesNotMatch(source,/getPaginationChapters|async function buildIndex/);
 const bootstrap=await readFile(new URL("../pwa-reader/ui-r3/bootstrap.js",import.meta.url),"utf8");
 const view=await readFile(new URL("../pwa-reader/ui-r3/views/readerView.js",import.meta.url),"utf8");
 assert.doesNotMatch(bootstrap+view,/r3\.reader\.paginating|r3\.reader\.paginationError/);
});
test("source progress uses section and source offset, never physical page counts",()=>{
 assert.equal(typeof layout.sourceBookProgress,"function");
 assert.equal(layout.sourceBookProgress(2,4,50,100),0.625);
 assert.equal(layout.sourceBookProgress(0,80,0,100),0);
 assert.equal(layout.sourceBookProgress(3,4,100,100),1);
 assert.equal(layout.sourceBookProgress(0,0,0,0),0);
});
test("immersive geometry reserves only safe-area and a small HUD",async()=>{
 const css=await readFile(new URL("../pwa-reader/ui-r3/styles/base.css",import.meta.url),"utf8");
 assert.doesNotMatch(css,/calc\(68px \+ env|calc\(112px \+ env/);
 assert.doesNotMatch(css,/data-chrome-visible="false"[^{}]*page-indicator\s*\{\s*visibility: hidden/);
 assert.match(css,/touch-action:\s*pan-y pinch-zoom/);
});

test("gesture arena permanently rejects vertical, long-press and edge starts",()=>{
 assert.equal(typeof layout.readerSwipeIntent,"function");
 const gesture={startX:200,startY:300,startTime:100,viewportWidth:393,intent:"pending"};
 assert.equal(layout.readerSwipeIntent(gesture,180,303,150),"horizontal");
 assert.equal(layout.readerSwipeIntent(gesture,195,320,150),"rejected");
 assert.equal(layout.readerSwipeIntent({...gesture,intent:"rejected"},90,320,180),"rejected");
 assert.equal(layout.readerSwipeIntent(gesture,110,300,500),"rejected");
 assert.equal(layout.readerSwipeIntent({...gesture,startX:12},100,300,150),"rejected");
 assert.equal(layout.readerSwipeIntent({...gesture,startX:380},290,300,150),"rejected");
});

test("EPUB distinguishes visual, text and empty source bodies",async()=>{
 const epub=await import("../pwa-reader/epubLoader.js");
 assert.equal(typeof epub.classifyChapterContent,"function");
 assert.equal(epub.classifyChapterContent("<p>Hello</p>","Hello"),"text");
 assert.equal(epub.classifyChapterContent('<img src="cover.svg"/>',""),"media");
 assert.equal(epub.classifyChapterContent("<svg><rect/></svg>",""),"media");
 assert.equal(epub.classifyChapterContent("<div> </div>",""),"empty");
});
import { createPageTurnTransition } from "../pwa-reader/ui-r3/readerPageTurn.js";
function frameClock() {
 let id=0; const frames=new Map();
 return {requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},tick(time){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time))}};
}
test("page turn commits once at completion and ignores overlapping turns",async()=>{
 const clock=frameClock(),turn=createPageTurnTransition(clock);let position=12,visual=0;
 const operation={draw:f=>visual=f,commit:()=>position++,rollback:()=>visual=0};
 const done=turn.run(operation);
 assert.equal(turn.active,true);
 assert.equal(await turn.run(operation),false);
 clock.tick(10);clock.tick(90);
 assert.ok(visual>0 && visual<1);assert.equal(position,12);
 clock.tick(170);assert.equal(await done,true);assert.equal(position,13);assert.equal(turn.active,false);
});
test("cancel, failed drawing and invalidated page preserve the logical position",async()=>{
 for(const reason of ["cancel","draw","detach"]){
  const clock=frameClock(),turn=createPageTurnTransition(clock);let position=12,visual=0,valid=true;
  const done=turn.run({draw:f=>{visual=f;if(reason==="draw")throw Error("paint failed")},commit:()=>position++,rollback:()=>visual=0,valid:()=>valid});
  clock.tick(10);clock.tick(90);
  if(reason==="cancel")turn.cancel();
  if(reason==="detach"){valid=false;clock.tick(170)}
  assert.equal(await done,false);assert.equal(position,12);assert.equal(visual,0);assert.equal(turn.active,false);
 }
});
test("reduced motion commits without scheduling intermediate frames",async()=>{
 const clock=frameClock(),turn=createPageTurnTransition(clock);let position=0;
 assert.equal(await turn.run({draw:()=>{},commit:()=>position++,rollback:()=>{},reducedMotion:true}),true);
 assert.equal(position,1);assert.equal(turn.active,false);
});
test("failed commit rolls back and leaves the transaction usable", async () => {
 const clock = frameClock(), turn = createPageTurnTransition(clock);
 let rolledBack = false;
 const completed = await turn.run({ draw() {}, commit() { throw Error("commit failed"); },
   rollback() { rolledBack = true; }, reducedMotion: true });
 assert.equal(completed, false); assert.equal(rolledBack, true); assert.equal(turn.active, false);
 assert.equal(await turn.run({ draw() {}, commit() {}, rollback() {}, reducedMotion: true }), true);
});
test("cancellation is idempotent and late frames cannot commit a cancelled transaction", async () => {
 const clock = frameClock(), turn = createPageTurnTransition(clock); let commits = 0, rollbacks = 0;
 const done = turn.run({ draw() {}, commit() { commits++; }, rollback() { rollbacks++; } });
 clock.tick(10); turn.cancel(); turn.cancel(); clock.tick(200);
 assert.equal(await done, false); assert.equal(commits, 0); assert.equal(rollbacks, 1);
 const retry = turn.run({ draw() {}, commit() { commits++; }, rollback() {} });
 clock.tick(300); clock.tick(500); assert.equal(await retry, true); assert.equal(commits, 1);
});
test("genuine EPUB render failure still reports an error",async()=>{
 const {loadChapterContent}=await import("../pwa-reader/epubLoader.js");
 await assert.rejects(loadChapterContent({load(){},spine:{spineItems:[{async render(){throw Error("bad zip")}}]}},{order:1,title:"Broken"}),/Chapter failed to render: Broken/);
});
