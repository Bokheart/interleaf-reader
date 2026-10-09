import { R3_ACTIONS } from "./actions.js";

// Explicit QA opt-in, memory only. Never copy content, source locators or book IDs.
export function bindReaderInteractionTrace(root, store) {
  const windowRef = root.ownerDocument?.defaultView;
  if (new URLSearchParams(windowRef?.location?.search || "").get("interactionTrace") !== "1") return null;
  const entries = [];
  let sequence = 0, session = 0, book = null;
  const record = (event, source, reason = null) => {
    const state = store.getState();
    if (state.activeBookId !== book) { book = state.activeBookId; session += 1; }
    entries.push({ order: ++sequence, event, source, reason, route: state.activeScreen,
      session: book ? session : null });
    if (entries.length > 256) entries.shift();
  };
  let route = store.getState().activeScreen;
  const unsubscribe = store.subscribe((state, action) => {
    if (action?.type === R3_ACTIONS.SET_ACTIVE_BOOK && state.activeBookId) {
      book = state.activeBookId; session += 1;
    }
    if (state.activeScreen !== route) { route = state.activeScreen; record("ROUTE_CHANGED", "store"); }
  });
  return { record, snapshot: () => entries.map(entry => ({ ...entry })),
    clear: () => { entries.length = 0; }, destroy: unsubscribe };
}
