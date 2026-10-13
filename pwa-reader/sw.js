const CACHE_NAME = 'interleaf-reader-static-v10';
const CACHE_PREFIX = 'interleaf-reader-static-';
const DICTIONARY_CACHE_NAME = 'interleaf-reader-dictionary-metadata-v1';
const DICTIONARY_CACHE_PREFIX = 'interleaf-reader-dictionary-';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './adapters/booksAdapter.js',
  './adapters/modesAdapter.js',
  './adapters/readerAdapter.js',
  './adapters/settingsAdapter.js',
  './adapters/vocabularyAdapter.js',
  './r3.html',
  './readerBookmarks.js',
  './readerProgress.js',
  './ui-r3/actions.js',
  './ui-r3/bootstrap.js',
  './ui-r3/components/bookRow.js',
  './ui-r3/components/bottomNavigation.js',
  './ui-r3/components/dom.js',
  './ui-r3/controller.js',
  './ui-r3/readerHistory.js',
  './ui-r3/readerInteractionTrace.js',
  './ui-r3/readerLayout.js',
  './ui-r3/readerPageTurn.js',
  './ui-r3/routes.js',
  './ui-r3/standaloneDisplay.js',
  './ui-r3/store.js',
  './ui-r3/styles/base.css',
  './ui-r3/styles/reader-content.css',
  './ui-r3/styles/tokens.css',
  './ui-r3/views/appShellView.js',
  './ui-r3/views/homeView.js',
  './ui-r3/views/libraryView.js',
  './ui-r3/views/readerView.js',
  './ui-r3/views/settingsView.js',
  './ui-r3/views/vocabularyView.js',
  './styles.css',
  './manifest.webmanifest',
  './manifest-r3.webmanifest',
  './app.js',
  './epubLoader.js',
  './glossaryEngine.js',
  './guideBook.js',
  './i18n.js',
  './levelBaselineEngine.js',
  './navigationEngine.js',
  './readingModes.js',
  './storage.js',
  './readerAppearance.js',
  './translationEngine.js',
  './vocabEngine.js',
  './dictionaryMetadata.js',
  './identity/runtime.mjs',
  './identity/identity-resolver.mjs',
  './identity/identity-lexicon.mjs',
  './identity/resolver.mjs',
  './identity/lexicon.mjs',
  './identity/phrase-constraints.mjs',
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
          // Retire stale metadata caches, including the old research namespace.
          if (cacheName.startsWith(DICTIONARY_CACHE_PREFIX) && cacheName !== DICTIONARY_CACHE_NAME) {
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

  // Exact deployment-relative public dataset boundary. No books, profiles,
  // query-bearing requests, or other projects enter the dictionary cache.
  const dictionaryRoot = new URL('../data/dictionary/', scopeUrl).pathname;
  const dictionaryPath = url.pathname.startsWith(dictionaryRoot) ? url.pathname.slice(dictionaryRoot.length) : '';
  if (!url.search && /^(?:[a-z0-9][a-z0-9._-]*\/)?(?:manifest\.json|shards\/[a-z0-9]+\.json)$/i.test(dictionaryPath)) {
    event.respondWith((async () => {
      let cache = null;
      try {
        cache = await caches.open(DICTIONARY_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
      } catch { /* Cache Storage is optional; still try the network. */ }
      try {
        const response = await fetch(request);
        if (cache && response?.ok && !response.redirected
            && response.headers.get('content-type')?.includes('application/json')) {
          try { await cache.put(request, response.clone()); } catch { /* Quota cannot hide a successful response. */ }
        }
        return response;
      } catch { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // Navigation fallback inside scope: network first, then cached index.html
  if (request.mode === 'navigate' && url.pathname.startsWith(scopeUrl.pathname)) {
    event.respondWith(
      fetch(request).catch(() => {
        if (url.pathname === new URL('./r3.html', scopeUrl).pathname) return caches.match('./r3.html');
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
