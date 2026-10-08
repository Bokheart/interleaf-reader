import { R3_ROUTES } from "./routes.js";

// One history entry per Reader visit, not per page/seek. Browser Back therefore
// leaves the book for its actual Interleaf origin; no custom edge gesture needed.
export function bindReaderHistory(windowRef, store, controller) {
  const history = windowRef?.history;
  if (!history?.pushState || !windowRef.addEventListener) return null;
  const valid = entry => entry && Object.values(R3_ROUTES).includes(entry.screen);
  const isSettings = screen => [R3_ROUTES.SETTINGS_HOME, R3_ROUTES.SETTINGS_LANGUAGE,
    R3_ROUTES.SETTINGS_APPEARANCE, R3_ROUTES.SETTINGS_READING].includes(screen);
  const initial = history.state?.interleafR3;
  let previous = store.getState();
  let restoring = false;
  let sequence = 0;
  let pending = Promise.resolve();
  if (!valid(initial)) history.replaceState({ ...history.state, interleafR3: { screen: previous.activeScreen } }, "");
  const unsubscribe = store.subscribe(state => {
    const before = previous;
    previous = state;
    if (restoring) return;
    if (state.activeScreen === before.activeScreen) {
      if (state.activeScreen === R3_ROUTES.READER && state.activeBookId !== before.activeBookId) {
        history.replaceState({ interleafR3: { ...history.state?.interleafR3,
          screen: R3_ROUTES.READER, bookId: state.activeBookId } }, "");
      }
      return;
    }
    const entry = { screen: state.activeScreen };
    if (isSettings(state.activeScreen) && !isSettings(before.activeScreen)) {
      history.pushState({ interleafR3: entry }, "");
    } else if (state.activeScreen === R3_ROUTES.READER) {
      entry.bookId = state.activeBookId;
      entry.returnScreen = isSettings(before.activeScreen)
        ? history.state?.interleafR3?.returnScreen || R3_ROUTES.HOME
        : before.activeScreen;
      if (isSettings(before.activeScreen)) history.replaceState({ interleafR3: entry }, "");
      else history.pushState({ interleafR3: entry }, "");
    } else history.replaceState({ ...history.state, interleafR3: entry }, "");
  });
  const restore = entry => {
    if (!valid(entry)) return Promise.resolve();
    const token = ++sequence;
    restoring = true;
    pending = pending.catch(() => {}).then(async () => {
      if (token !== sequence) return;
      if (entry.screen === R3_ROUTES.READER && entry.bookId) {
        const state = store.getState();
        if (isSettings(state.activeScreen) && state.activeBookId === entry.bookId
          && typeof controller.returnFromSettings === "function") await controller.returnFromSettings();
        else await controller.selectBook(entry.bookId);
      }
      else await controller.navigate(entry.screen);
    }).finally(() => { if (token === sequence) restoring = false; });
    return pending;
  };
  const onPopState = event => { void restore(event.state?.interleafR3); };
  windowRef.addEventListener("popstate", onPopState);
  return {
    restoreInitial: () => valid(initial) ? restore(initial) : Promise.resolve(),
    backFromSettings() {
      if (!isSettings(history.state?.interleafR3?.screen)) return false;
      history.back(); return true;
    },
    back() {
      const entry = history.state?.interleafR3;
      if (entry?.screen !== R3_ROUTES.READER || !entry.returnScreen) return false;
      history.back(); return true;
    },
    destroy() { unsubscribe(); windowRef.removeEventListener("popstate", onPopState); }
  };
}
