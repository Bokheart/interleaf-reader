import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyDisplayModeDataset,
  getEffectiveThemeColorMeta,
  isLikelyIPhone,
  isStandaloneDisplay,
  resolveShellTheme,
  shouldShowImmersiveInstallGuidance,
  syncDocumentTheme
} from "../pwa-reader/ui-r3/standaloneDisplay.js";
import { createSettingsView } from "../pwa-reader/ui-r3/views/settingsView.js";
import { createLibraryView } from "../pwa-reader/ui-r3/views/libraryView.js";
import { createTranslator } from "../pwa-reader/i18n.js";
import { createInitialR3State } from "../pwa-reader/ui-r3/store.js";
import { en } from "../pwa-reader/locales/en.js";
import { zhCN } from "../pwa-reader/locales/zh-CN.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pwa = path.join(__dirname, "..", "pwa-reader");

function createMockElement(tagName = "div") {
  return {
    tagName: String(tagName).toUpperCase(),
    id: "",
    className: "",
    textContent: "",
    dataset: {},
    attributes: new Map(),
    style: {},
    children: [],
    parentNode: null,
    ownerDocument: null,
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === "id") this.id = String(value);
      if (name === "class") this.className = String(value);
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes.has(name) ? this.attributes.get(name) : null;
    },
    removeAttribute(name) {
      this.attributes.delete(name);
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        delete this.dataset[key];
      }
    }
  };
}

function createMockDocument(windowProps = {}) {
  const body = createMockElement("body");
  const head = createMockElement("head");
  const documentElement = createMockElement("html");
  const documentRef = {
    body,
    head,
    documentElement,
    createElement(tagName) {
      const element = createMockElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    createElementNS(_namespace, tagName) {
      const element = createMockElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    querySelector(selector) {
      if (selector === 'meta[name="theme-color"][data-r3-theme-color="active"]'
        || selector === 'meta[name="theme-color"][data-r3-theme-color="dynamic"]') {
        return head.children.find(node => node.attributes.get("data-r3-theme-color") === "active"
          || node.attributes.get("data-r3-theme-color") === "dynamic") || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'meta[name="theme-color"]') {
        return head.children.filter(node => node.attributes.get("name") === "theme-color");
      }
      return [];
    },
    defaultView: {
      navigator: {},
      matchMedia() {
        return { matches: false };
      },
      ...windowProps
    }
  };
  body.ownerDocument = documentRef;
  head.ownerDocument = documentRef;
  documentElement.ownerDocument = documentRef;
  body.setAttribute = function setAttribute(name, value) {
    this.attributes.set(name, String(value));
  };
  documentElement.setAttribute = function setAttribute(name, value) {
    this.attributes.set(name, String(value));
  };
  head.insertBefore = function insertBefore(node, reference) {
    if (reference) {
      const index = this.children.indexOf(reference);
      if (index >= 0) this.children.splice(index, 0, node);
      else this.children.unshift(node);
    } else {
      this.children.unshift(node);
    }
    node.parentNode = this;
    return node;
  };
  return documentRef;
}

function collectText(root) {
  const parts = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    if (node.textContent) parts.push(node.textContent);
    stack.push(...(node.children || []));
  }
  return parts.join(" ");
}

test("R3 entry declares a dedicated installable manifest and iOS standalone metadata", async () => {
  const html = await readFile(path.join(pwa, "r3.html"), "utf8");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="manifest" href="\.\/manifest-r3\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\.\/assets\/icons\/icon-192\.png"/);
  assert.match(html, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /data-r3-theme-color="active"/);
  assert.doesNotMatch(html, /media="\(prefers-color-scheme:/);
  assert.doesNotMatch(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
});

test("Legacy production entry keeps its own manifest start URL", async () => {
  const html = await readFile(path.join(pwa, "index.html"), "utf8");
  const legacy = JSON.parse(await readFile(path.join(pwa, "manifest.webmanifest"), "utf8"));
  const r3 = JSON.parse(await readFile(path.join(pwa, "manifest-r3.webmanifest"), "utf8"));

  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.equal(legacy.start_url, "./");
  assert.equal(r3.start_url, "./r3.html");
  assert.equal(r3.id, "./r3.html");
  assert.notEqual(legacy.start_url, r3.start_url);
});

test("standalone display detection covers iOS navigator.standalone and display-mode media", () => {
  assert.equal(isStandaloneDisplay({ navigator: { standalone: true } }), true);
  assert.equal(isStandaloneDisplay({
    navigator: {},
    matchMedia: query => ({ matches: String(query).includes("standalone") })
  }), true);
  assert.equal(isStandaloneDisplay({
    navigator: {},
    matchMedia: () => ({ matches: false })
  }), false);
  assert.equal(isLikelyIPhone({ navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } }), true);
  assert.equal(isLikelyIPhone({ navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }), false);
  assert.equal(shouldShowImmersiveInstallGuidance({
    navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  }), false);

  const documentRef = createMockDocument({
    navigator: { standalone: true }
  });
  assert.equal(applyDisplayModeDataset(documentRef), true);
  assert.equal(documentRef.documentElement.attributes.get("data-display-mode"), "standalone");
});

test("document theme sync updates authoritative theme-color without html/body dark datasets", () => {
  const documentRef = createMockDocument();
  const stale = documentRef.createElement("meta");
  stale.setAttribute("name", "theme-color");
  stale.setAttribute("media", "(prefers-color-scheme: dark)");
  stale.setAttribute("content", "#141a22");
  documentRef.head.children.push(stale);
  stale.parentNode = documentRef.head;

  assert.deepEqual(resolveShellTheme("dark"), {
    themeColor: "#141a22",
    background: "#141a22"
  });
  syncDocumentTheme(documentRef, "dark");
  assert.equal(documentRef.documentElement.dataset.readerTheme, undefined);
  assert.equal(documentRef.body.dataset.readerTheme, undefined);
  assert.equal(documentRef.body.style.backgroundColor, "#141a22");
  const metas = documentRef.querySelectorAll('meta[name="theme-color"]');
  assert.equal(metas.length, 1);
  assert.equal(metas[0].getAttribute("data-r3-theme-color"), "active");
  assert.equal(metas[0].getAttribute("media"), null);
  assert.equal(metas[0].getAttribute("content"), "#141a22");
  assert.equal(getEffectiveThemeColorMeta(documentRef), metas[0]);
  syncDocumentTheme(documentRef, "light");
  assert.equal(metas[0].getAttribute("content"), "#f6f7f4");
});

test("Settings explains Home Screen install only on iPhone or standalone", () => {
  const desktopView = createSettingsView(
    createMockDocument({ navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }),
    createInitialR3State(),
    createTranslator("en")
  );
  assert.doesNotMatch(collectText(desktopView), /Immersive reading on iPhone/);

  const browserView = createSettingsView(
    createMockDocument({
      navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }
    }),
    createInitialR3State(),
    createTranslator("en")
  );
  const browserText = collectText(browserView);
  assert.match(browserText, /Immersive reading on iPhone/);
  assert.match(browserText, /Open Interleaf Reader in Safari/);
  assert.doesNotMatch(browserText, /\bR3\b/);
  assert.match(browserText, /may keep its own local books, progress, and vocabulary, separate from Safari/);
  assert.match(browserText, /not migrated automatically/);

  const standaloneView = createSettingsView(
    createMockDocument({ navigator: { standalone: true, userAgent: "Mozilla/5.0 (iPhone)" } }),
    createInitialR3State(),
    createTranslator("en")
  );
  const standaloneText = collectText(standaloneView);
  assert.match(standaloneText, /Standalone Web App/);
  assert.match(standaloneText, /may be separate from Safari/);
});

test("standalone empty Library explains storage isolation without implying deletion", () => {
  const state = createInitialR3State();
  state.library = { books: [] };
  const view = createLibraryView(
    createMockDocument({
      navigator: {
        standalone: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
      }
    }),
    state,
    createTranslator("en")
  );
  const text = collectText(view);
  assert.match(text, /may keep its own library, separate from Safari/);
  assert.match(text, /nothing was deleted/);
});

test("immersive Settings locale keys stay paired in English and Simplified Chinese", () => {
  for (const key of [
    "r3.settings.immersive.installTitle",
    "r3.settings.immersive.installBody",
    "r3.settings.immersive.standaloneTitle",
    "r3.settings.immersive.standaloneBody",
    "r3.library.emptyStandaloneHint"
  ]) {
    assert.equal(typeof en[key], "string", key);
    assert.equal(typeof zhCN[key], "string", key);
  }
  assert.deepEqual(Object.keys(zhCN).sort(), Object.keys(en).sort());
});

test("Reader chrome hide styles keep overlay chrome and shell safe-area contracts", async () => {
  const css = await readFile(path.join(pwa, "ui-r3/styles/base.css"), "utf8");
  assert.match(css, /The prose geometry is identical with and without chrome/);
  assert.doesNotMatch(css, /html\[data-reader-theme="dark"\]/);
  assert.match(css, /\.r3-bottom-nav \{[\s\S]*safe-area-inset-left/);
  assert.match(css, /\.r3-reader-header \{[\s\S]*safe-area-inset-left/);
  assert.match(css, /\.r3-reader-footer \{[\s\S]*safe-area-inset-left/);
  assert.match(css, /\.r3-main \{[\s\S]*safe-area-inset-left/);
});
