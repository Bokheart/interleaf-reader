import { R3_ROUTES } from "./routes.js";

// One history entry per Reader visit, not per page/seek. Browser Back therefore
// leaves the book for its actual Interleaf origin; no custom edge gesture needed.
export function bindReaderHistory(windowRef, store, controller) {
  const history = windowRef?.history;
  if (!history?.pushState || !windowRef.addEventListener) return null;
  const valid = entry => entry && Object.values(R3_ROUTES).includes(entry.screen);
  const initial = history.state?.interleafR3;
  let previous = store.getState();
  let restoring = false;
  let sequence = 0;
  let pending = Promise.resolve();
  if (!valid(initial)) history.replaceState({ ...history.state, interleafR3: { screen: previous.activeScreen } }, "");
  const unsubscribe = store.subscribe(state => {
    const before = previous;
    previous = state;
    if (restoring || state.activeScreen === before.activeScreen) return;
    const entry = { screen: state.activeScreen };
    if (state.activeScreen === R3_ROUTES.READER) {
      entry.bookId = state.activeBookId;
      entry.returnScreen = before.activeScreen;
      history.pushState({ interleafR3: entry }, "");
    } else history.replaceState({ ...history.state, interleafR3: entry }, "");
  });
  const restore = entry => {
    if (!valid(entry)) return Promise.resolve();
    const token = ++sequence;
    restoring = true;
    pending = pending.catch(() => {}).then(async () => {
      if (token !== sequence) return;
      if (entry.screen === R3_ROUTES.READER && entry.bookId) await controller.selectBook(entry.bookId);
      else await controller.navigate(entry.screen);
    }).finally(() => { if (token === sequence) restoring = false; });
    return pending;
  };
  const onPopState = event => { void restore(event.state?.interleafR3); };
  windowRef.addEventListener("popstate", onPopState);
  return {
    restoreInitial: () => valid(initial) ? restore(initial) : Promise.resolve(),
    back() {
      const entry = history.state?.interleafR3;
      if (entry?.screen !== R3_ROUTES.READER || !entry.returnScreen) return false;
      history.back(); return true;
    },
    destroy() { unsubscribe(); windowRef.removeEventListener("popstate", onPopState); }
  };
}
