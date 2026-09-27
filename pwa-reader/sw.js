const CACHE_NAME = 'interleaf-reader-static-v2';
const CACHE_PREFIX = 'interleaf-reader-static-';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './app.js',
  './epubLoader.js',
  './glossaryEngine.js',
  './guideBook.js',
  './i18n.js',
  './levelBaselineEngine.js',
  './navigationEngine.js',
  './readingModes.js',
  './storage.js',
  './translationEngine.js',
  './vocabEngine.js',
  './locales/en.js',
  './locales/zh-CN.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './vendor/jszip-3.10.1/jszip.min.js',
  './vendor/epubjs-0.3.93/epub.min.js',
  '../data/vocabulary.json',
  '../data/slang_idioms.json',
  '../data/protected_terms.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/level1_basic_words.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/level2_basic_words.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/level3_basic_words.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/level4_basic_words.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/level5_basic_words.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/form_index.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/phrase_inventory.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/provenance_license_manifest.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/bysa_derived/README.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/bysa_derived/l5_balanced_wordfreq_additions.json',
  '../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/NOTICE.md'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(error => {
        console.error("Service Worker install precache failed:", error);
        throw error;
      })
  );
  // Do not call skipWaiting() per instructions.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle only appropriate requests
  if (request.method !== 'GET') return;
  
  // Ignore cross-origin requests
  if (url.origin !== location.origin) return;
  
  // Ignore blob: and data: URLs (handled implicitly since origin is different or protocol is not http)
  if (!url.protocol.startsWith('http')) return;
  
  // Ignore Range requests
  if (request.headers.has('range')) return;

  const scopeUrl = new URL(self.registration.scope);

  // Navigation fallback inside scope: network first, then cached index.html
  if (request.mode === 'navigate' && url.pathname.startsWith(scopeUrl.pathname)) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Static assets inside scope or data/ directory: cache first, network fallback without runtime cache insertion
  if (url.pathname.startsWith(scopeUrl.pathname) || url.pathname.includes('/data/')) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }
  
  // Other same-origin requests are passed through implicitly
});
