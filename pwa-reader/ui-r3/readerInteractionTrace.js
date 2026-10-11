import { R3_ACTIONS } from "./actions.js";

// Temporary R4.3 QA opt-in, bounded memory only. Chapters are ordinal numbers;
// never copy content, titles, source locators, history IDs or book identifiers.
export function bindReaderInteractionTrace(root, store) {
  const windowRef = root.ownerDocument?.defaultView;
  if (new URLSearchParams(windowRef?.location?.search || "").get("interactionTrace") !== "1") return null;
  const entries = [];
  let sequence = 0, session = 0, book = null;
  const current = () => {
    const state = store.getState(), history = windowRef?.history?.state?.interleafR3;
    return { route: state.activeScreen,
      domRoute: root.querySelector?.('.r3-app-frame')?.dataset?.activeScreen || root.dataset?.r3ActiveScreen || null,
      history: { screen: history?.screen || null, step: history?.step ?? null,
        consumedSettings: Boolean(history?.consumedSettings), settingsOrigin: history?.settingsSession?.origin?.screen || null },
      appearance: state.reader?.readerAppearance?.theme || null, overlay: state.openOverlay || null,
      navigation: root.__r3App?.controller?.getNavigationState?.() || null,
      restore: root.__readerHistory?.snapshot?.() || null,
      layout: root.__readerLayout?.snapshot?.() || null };
  };
  const record = (event, source, reason = null, incoming = null) => {
    const state = store.getState();
    if (state.activeBookId !== book) { book = state.activeBookId; session += 1; }
    const traversal = incoming ? { incomingScreen: incoming.incomingScreen, incomingStep: incoming.incomingStep,
      direction: incoming.direction, hasUAVisualTransition: incoming.hasUAVisualTransition === true } : null;
    entries.push({ order: ++sequence, time: windowRef?.performance?.now?.() || 0,
      event, source, reason, ...current(), traversal, session: book ? session : null });
    if (entries.length > 256) entries.shift();
  };
  let route = store.getState().activeScreen;
  const unsubscribe = store.subscribe((state, action) => {
    if (action?.type === R3_ACTIONS.SET_ACTIVE_BOOK && state.activeBookId) {
      book = state.activeBookId; session += 1;
    }
    if (state.activeScreen !== route) { route = state.activeScreen; record("ROUTE_CHANGED", "store"); }
  });
  const lifecycle = event => record(event.type.toUpperCase(), "lifecycle");
  for (const event of ["pageshow", "pagehide"]) windowRef?.addEventListener?.(event, lifecycle);
  root.ownerDocument?.addEventListener?.("visibilitychange", lifecycle);
  return { record, current, snapshot: () => entries.map(entry => structuredClone(entry)),
    clear: () => { entries.length = 0; }, destroy() {
      unsubscribe();
      for (const event of ["pageshow", "pagehide"]) windowRef?.removeEventListener?.(event, lifecycle);
      root.ownerDocument?.removeEventListener?.("visibilitychange", lifecycle);
    } };
}
