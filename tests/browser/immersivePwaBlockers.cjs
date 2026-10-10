// Run with existing Playwright + Edge. Artifacts under generated/immersive-pwa-qa.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const JSZip = require("../../pwa-reader/vendor/jszip-3.10.1/jszip.min.js");

const root = path.resolve(__dirname, "../..");
const output = path.join(root, "generated/immersive-pwa-qa");

async function epub() {
  const zip = new JSZip();
  const prose = Array.from({ length: 40 }, (_, i) => (
    `<p>Garden ${i}. A visitor will mutter beside the quiet river while sunlight warms the bridge.</p>`
  )).join("");
  zip.file("mimetype", "application/epub+zip");
  zip.file("META-INF/container.xml", '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file("OPS/book.opf", '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">immersive-blocker-qa</dc:identifier><dc:title>Immersive QA</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c0" href="c0.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c0"/></spine></package>');
  zip.file("OPS/c0.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Garden</title></head><body><h1>Garden</h1>${prose}</body></html>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function parseRgb(value) {
  const match = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  assert.ok(match, `expected rgb color, got ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function luminance([r, g, b]) {
  const channel = value => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

async function importBook(page) {
  await page.evaluate(async () => {
    const app = document.querySelector("#r3-root").__r3App;
    const response = await fetch("/qa/blocker.epub");
    const file = new File([await response.blob()], "blocker.epub", {
      type: "application/epub+zip",
      lastModified: 1
    });
    await app.controller.importBook(file);
    const bookKey = app.store.getState().importStatus.lastImportedBookKey;
    if (!bookKey) {
      throw new Error("import did not return a bookKey");
    }
    await app.controller.selectBook(bookKey);
  });
  await page.waitForFunction(() => (
    document.querySelector("#r3-root").__r3App.store.getState().reader.status === "ready"
    && document.querySelector("#r3-root").__r3App.store.getState().activeScreen === "reader.canvas"
  ));
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const fixtures = { "/qa/blocker.epub": await epub() };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
      assert.ok(file.startsWith(root + path.sep));
      const body = fixtures[pathname] || await fs.readFile(file);
      res.setHeader("Content-Type", ({
        js: "text/javascript", mjs: "text/javascript", css: "text/css", html: "text/html",
        json: "application/json", webmanifest: "application/manifest+json",
        epub: "application/epub+zip", png: "image/png", svg: "image/svg+xml"
      })[file.split(".").pop()] || "application/octet-stream");
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    channel: process.env.READER_QA_CHANNEL || "msedge",
    headless: true,
    args: ["--no-proxy-server"]
  });
  const results = [];

  try {
    // Blocker 1 — Dark Reader preference must not darken shell routes, including after reload.
    {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();
      await page.goto(origin + "/pwa-reader/r3.html");
      await page.waitForFunction(() => document.querySelector("#r3-root")?.__r3App?.store.getState().initialized);
      await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
      await importBook(page);
      await page.evaluate(async () => {
        await document.querySelector("#r3-root").__r3App.controller.setReaderAppearance({
          fontSize: "md", lineHeight: "normal", margin: "medium", theme: "dark"
        });
      });
      await page.waitForFunction(() => (
        document.querySelector(".r3-reader-screen")?.getAttribute("data-reader-theme") === "dark"
      ));

      // Persist across cold boot with a saved Dark Reader preference.
      await page.reload();
      await page.waitForFunction(() => document.querySelector("#r3-root")?.__r3App?.store.getState().initialized);
      if (await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').count()) {
        await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();
      }
      await page.waitForFunction(() => (
        document.querySelector("#r3-root").__r3App.store.getState().settings?.readerAppearance?.theme === "dark"
      ));

      const sampleShell = async () => page.evaluate(() => {
        const heading = document.querySelector(".r3-main h1, .r3-settings-header h1");
        const frame = document.querySelector(".r3-app-frame");
        return {
          screen: document.querySelector("#r3-root").__r3App.store.getState().activeScreen,
          htmlTheme: document.documentElement.getAttribute("data-reader-theme"),
          bodyTheme: document.body.getAttribute("data-reader-theme"),
          frameBackground: frame && getComputedStyle(frame).backgroundColor,
          headingColor: heading && getComputedStyle(heading).color
        };
      });

      // After reload the app may reopen the Reader; leave to Home first.
      await page.evaluate(async () => {
        const app = document.querySelector("#r3-root").__r3App;
        if (app.store.getState().activeScreen === "reader.canvas") {
          await app.controller.navigate("shell.home");
        }
      });
      await page.waitForFunction(() => document.querySelector("#r3-root").__r3App.store.getState().activeScreen === "shell.home");

      const home = await sampleShell();
      assert.equal(home.htmlTheme, null);
      assert.equal(home.bodyTheme, null);
      assert.ok(contrastRatio(parseRgb(home.headingColor), parseRgb(home.frameBackground)) >= 4.5, JSON.stringify(home));

      await page.locator('.r3-bottom-nav [data-action="navigate"][data-route="shell.library"]').click();
      await page.waitForFunction(() => document.querySelector("#r3-root").__r3App.store.getState().activeScreen === "shell.library");
      const library = await sampleShell();
      assert.ok(contrastRatio(parseRgb(library.headingColor), parseRgb(library.frameBackground)) >= 4.5, JSON.stringify(library));

      await page.locator('.r3-library-header [data-action="navigate"][data-route="settings.home"]').click();
      await page.waitForFunction(() => String(document.querySelector("#r3-root").__r3App.store.getState().activeScreen).startsWith("settings"));
      const settings = await sampleShell();
      assert.ok(contrastRatio(parseRgb(settings.headingColor), parseRgb(settings.frameBackground)) >= 4.5, JSON.stringify(settings));
      await page.locator('[data-action="settings-return"]').click();
      await page.waitForFunction(() => !String(document.querySelector("#r3-root").__r3App.store.getState().activeScreen).startsWith("settings"));

      await page.evaluate(async () => {
        const app = document.querySelector("#r3-root").__r3App;
        const state = app.store.getState();
        const bookKey = state.home?.continueReading?.bookKey
          || state.library?.books?.[0]?.bookKey
          || state.importStatus?.lastImportedBookKey;
        if (!bookKey) {
          throw new Error("no bookKey available to resume");
        }
        await app.controller.resumeBook(bookKey);
      });
      await page.waitForFunction(() => (
        document.querySelector("#r3-root").__r3App.store.getState().reader.status === "ready"
        && document.querySelector("#r3-root").__r3App.store.getState().activeScreen === "reader.canvas"
      ));
      const reader = await page.evaluate(() => {
        const screen = document.querySelector(".r3-reader-screen");
        const scroll = document.querySelector(".r3-reader-scroll");
        return {
          screenTheme: screen?.getAttribute("data-reader-theme"),
          scrollBackground: scroll && getComputedStyle(scroll).backgroundColor,
          settingsTheme: document.querySelector("#r3-root").__r3App.store.getState().settings.readerAppearance.theme
        };
      });
      assert.equal(reader.screenTheme, "dark");
      assert.equal(reader.settingsTheme, "dark");
      assert.ok(luminance(parseRgb(reader.scrollBackground)) < 0.2, JSON.stringify(reader));

      await page.locator('.r3-reader-header [data-action="navigate"][data-route="settings.home"]').click();
      await page.waitForFunction(() => String(document.querySelector("#r3-root").__r3App.store.getState().activeScreen).startsWith("settings"));
      const settingsFromReader = await sampleShell();
      assert.ok(
        contrastRatio(parseRgb(settingsFromReader.headingColor), parseRgb(settingsFromReader.frameBackground)) >= 4.5,
        JSON.stringify(settingsFromReader)
      );
      await page.locator('[data-action="settings-return"]').click();
      await page.waitForFunction(() => document.querySelector("#r3-root").__r3App.store.getState().activeScreen === "reader.canvas");
      assert.equal(
        await page.evaluate(() => document.querySelector(".r3-reader-screen")?.getAttribute("data-reader-theme")),
        "dark"
      );

      await page.screenshot({ path: path.join(output, "dark-shell-isolation.png") });
      results.push({ name: "dark-reader-theme-isolation", passed: true, home, library, settings, reader, settingsFromReader });
      await context.close();
      console.log("PASS dark Reader preference leaves shell routes readable");
    }

    // Blocker 2 — landscape horizontal safe areas for interactive chrome.
    {
      const context = await browser.newContext({
        viewport: { width: 852, height: 393 },
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", {
        insets: { top: 0, left: 59, right: 59, bottom: 21 }
      });
      await page.goto(origin + "/pwa-reader/r3.html");
      await page.waitForFunction(() => document.querySelector("#r3-root")?.__r3App?.store.getState().initialized);
      await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();

      const shellGeometry = await page.evaluate(() => {
        const insetProbe = document.createElement("div");
        insetProbe.style.cssText = "position:fixed;left:env(safe-area-inset-left,0px);top:0;width:1px;height:1px";
        document.body.appendChild(insetProbe);
        const leftInset = insetProbe.getBoundingClientRect().left;
        insetProbe.remove();
        const targets = [
          [".r3-home-brand h1", "home-title"],
          ['.r3-bottom-nav [data-route="shell.home"]', "nav-home"],
          ['[data-action="import-open"]', "import"],
          ['[data-action="open-guide"]', "guide"]
        ];
        return {
          leftInset,
          controls: targets.map(([selector, name]) => {
            const el = document.querySelector(selector);
            if (!el) return { name, missing: true };
            const box = el.getBoundingClientRect();
            return { name, left: box.left, right: box.right, width: box.width, height: box.height };
          })
        };
      });
      assert.equal(shellGeometry.leftInset, 59);
      for (const control of shellGeometry.controls) {
        assert.equal(control.missing, undefined, control.name);
        assert.ok(control.left >= 59 - 0.5, JSON.stringify(control));
        assert.ok(control.right <= 852 - 59 + 0.5, JSON.stringify(control));
        assert.ok(control.height >= 24, JSON.stringify(control));
      }

      await importBook(page);
      const readerGeometry = await page.evaluate(() => {
        const headerButton = document.querySelector(".r3-reader-header button, .r3-reader-header .r3-icon-button");
        const footerControl = document.querySelector(".r3-reader-footer button, .r3-reader-footer .r3-reader-quick-control");
        return {
          headerLeft: headerButton?.getBoundingClientRect().left,
          headerRight: headerButton?.getBoundingClientRect().right,
          footerLeft: footerControl?.getBoundingClientRect().left,
          footerRight: footerControl?.getBoundingClientRect().right
        };
      });
      assert.ok(readerGeometry.headerLeft >= 59 - 0.5, JSON.stringify(readerGeometry));
      assert.ok(readerGeometry.footerLeft >= 59 - 0.5, JSON.stringify(readerGeometry));
      assert.ok(readerGeometry.headerRight <= 852 - 59 + 0.5, JSON.stringify(readerGeometry));
      assert.ok(readerGeometry.footerRight <= 852 - 59 + 0.5, JSON.stringify(readerGeometry));

      const beforeChrome = await page.evaluate(() => {
        const state = document.querySelector("#r3-root").__r3App.store.getState();
        return {
          chrome: state.reader.chromeVisible !== false,
          chapterId: state.activeChapterId,
          textOffset: state.reader.logicalPosition?.textOffset ?? null,
          pageIndex: state.reader.pagination?.pageIndex ?? null
        };
      });
      await page.evaluate(() => document.querySelector("#r3-root").__r3App.controller.toggleReaderChrome());
      const afterChrome = await page.evaluate(() => {
        const state = document.querySelector("#r3-root").__r3App.store.getState();
        return {
          chrome: state.reader.chromeVisible !== false,
          chapterId: state.activeChapterId,
          textOffset: state.reader.logicalPosition?.textOffset ?? null,
          pageIndex: state.reader.pagination?.pageIndex ?? null
        };
      });
      assert.notEqual(afterChrome.chrome, beforeChrome.chrome);
      assert.equal(afterChrome.chapterId, beforeChrome.chapterId);
      assert.equal(afterChrome.textOffset, beforeChrome.textOffset);

      await page.screenshot({ path: path.join(output, "landscape-safe-areas.png") });
      results.push({ name: "landscape-safe-areas", passed: true, shellGeometry, readerGeometry, beforeChrome, afterChrome });
      await context.close();
      console.log("PASS landscape safe-area insets clear interactive controls");
    }

    // Blocker 3 — one authoritative theme-color, not OS prefers-color-scheme metas.
    {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
        colorScheme: "dark",
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();
      await page.goto(origin + "/pwa-reader/r3.html");
      await page.waitForFunction(() => document.querySelector("#r3-root")?.__r3App?.store.getState().initialized);
      await page.locator('[data-action="set-ui-language"][data-ui-language="en"]').click();

      const shellTheme = await page.evaluate(() => {
        const metas = [...document.querySelectorAll('meta[name="theme-color"]')].map(meta => ({
          content: meta.getAttribute("content"),
          media: meta.getAttribute("media"),
          active: meta.getAttribute("data-r3-theme-color")
        }));
        return {
          metas,
          first: metas[0],
          prefersDark: matchMedia("(prefers-color-scheme: dark)").matches
        };
      });
      assert.equal(shellTheme.metas.length, 1);
      assert.equal(shellTheme.first.active, "active");
      assert.equal(shellTheme.first.media, null);
      assert.equal(shellTheme.first.content, "#f6f7f4");
      assert.equal(shellTheme.prefersDark, true);

      await importBook(page);
      await page.evaluate(async () => {
        await document.querySelector("#r3-root").__r3App.controller.setReaderAppearance({
          fontSize: "md", lineHeight: "normal", margin: "medium", theme: "dark"
        });
      });
      await page.waitForFunction(() => (
        document.querySelector(".r3-reader-screen")?.getAttribute("data-reader-theme") === "dark"
      ));
      const readerTheme = await page.evaluate(() => ({
        content: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
        count: document.querySelectorAll('meta[name="theme-color"]').length,
        screen: document.querySelector(".r3-reader-screen")?.getAttribute("data-reader-theme")
      }));
      assert.equal(readerTheme.count, 1);
      assert.equal(readerTheme.content, "#141a22");
      assert.equal(readerTheme.screen, "dark");

      results.push({ name: "theme-color-precedence", passed: true, shellTheme, readerTheme });
      await context.close();
      console.log("PASS authoritative theme-color follows Reader Appearance, not OS scheme alone");
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  await fs.writeFile(path.join(output, "blockers.json"), JSON.stringify(results, null, 2));
  console.log("PASS immersive PWA blocker regressions");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
