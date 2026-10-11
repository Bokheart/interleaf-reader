import test from 'node:test';
import assert from 'node:assert/strict';
import { bindReaderInteractionTrace } from '../pwa-reader/ui-r3/readerInteractionTrace.js';
import { createR3Store } from '../pwa-reader/ui-r3/store.js';
import { r3Actions } from '../pwa-reader/ui-r3/actions.js';

test('device trace remains opt-in, bounded, and omits history identities and book data', () => {
  const listeners = new Map(), store = createR3Store();
  const window = { location: { search: '' }, history: { state: { interleafR3: {
    screen: 'settings.home', step: 2, id: 'secret-history', bookId: 'secret-book',
    settingsSession: { id: 'secret-session', origin: { screen: 'reader.canvas', bookId: 'secret-book' } }
  } } }, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const root = { ownerDocument: { defaultView: window }, dataset: { r3ActiveScreen: 'reader.canvas' },
    __r3App: { controller: { getNavigationState: () => ({ pending: true,
      durableAnchor: { chapter: 2, textOffset: 124 } }) } } };
  assert.equal(bindReaderInteractionTrace(root, store), null);
  assert.equal(listeners.size, 0);
  window.location.search = '?interactionTrace=1';
  store.dispatch(r3Actions.setActiveBook({ bookId: 'secret-book' }));
  store.dispatch(r3Actions.setReaderState({ html: '<p>secret-prose</p>', readerAppearance: { theme: 'dark' } }));
  const trace = bindReaderInteractionTrace(root, store);
  for (let i = 0; i < 300; i++) trace.record('POPSTATE', 'history', null, {
    incomingScreen: 'reader.canvas', incomingStep: 1, direction: -1, hasUAVisualTransition: true,
    bookId: 'secret-book', text: 'secret-prose'
  });
  assert.equal(trace.snapshot().length, 256);
  assert.equal(trace.current().history.settingsOrigin, 'reader.canvas');
  assert.equal(trace.current().domRoute, 'reader.canvas');
  assert.equal(trace.current().appearance, 'dark');
  assert.deepEqual(trace.current().navigation.durableAnchor, { chapter: 2, textOffset: 124 });
  assert.doesNotMatch(JSON.stringify(trace.snapshot()), /secret-/);
  listeners.get('pagehide')({ type: 'pagehide' });
  assert.equal(trace.snapshot().at(-1).event, 'PAGEHIDE');
  trace.destroy(); assert.equal(listeners.size, 0);
});
