import { R3_ROUTES, isKnownR3Route } from "./routes.js";

// Reader visits own history slots. Settings owns one temporary slot over its
// origin; a traversed Settings slot is consumed into that origin, never reopened.
export function bindReaderHistory(windowRef, store, controller, trace = () => {}) {
  const history = windowRef?.history;
  if (!history?.pushState || !windowRef.addEventListener) return null;
  const valid = entry => entry && isKnownR3Route(entry.screen);
  const isSettings = screen => isKnownR3Route(screen) && screen.startsWith("settings.");
  const initial = history.state?.interleafR3;
  let previous = store.getState(), restoring = false, sequence = 0, ordinal = 0;
  let pending = Promise.resolve(), session = null, closing = false;
  let applyingRestore = false;
  const id = () => windowRef.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${++ordinal}`;
  const clean = entry => {
    const { settingsSession, consumedSettings, ...rest } = entry || {};
    return { ...rest, version: 2, id: rest.id || id(), step: rest.step ?? 0 };
  };
  const fromState = (state, base = {}) => state.activeScreen === R3_ROUTES.READER
    ? { ...clean(base), screen: state.activeScreen, bookId: state.activeBookId }
    : { version: 2, id: base.id || id(), step: base.step ?? 0, screen: state.activeScreen };
  let current = valid(initial) ? initial : fromState(previous);
  const write = (entry, push = false) => {
    current = entry;
    history[push ? "pushState" : "replaceState"]({ ...history.state, interleafR3: entry }, "");
  };
  if (!valid(initial)) write(current);
  const consumed = active => ({ ...clean(active.origin), step: current.step,
    consumedSettings: { id: active.id, originId: active.origin.id } });
  const unsubscribeNavigation = controller.subscribeNavigation?.(() => {
    if (!restoring || applyingRestore) return;
    ++sequence; restoring = false; closing = false;
    // The incoming entry was selected before its async restoration completed.
    // A newer explicit intent starts at the surface actually visible now.
    write(fromState(store.getState(), current));
  });
  const applyRestore = operation => {
    applyingRestore = true;
    try { return operation(); }
    finally { applyingRestore = false; }
  };
  const dismiss = () => {
    if (closing) return;
    if (!session) { void controller.returnFromSettings(); return; }
    closing = true;
    // Replace our single known slot before leaving it. Forward can visit only
    // the origin duplicate. Native Back leaves a marked Settings slot, which
    // onPopState normalizes in place even after a reload.
    write(consumed(session));
    history.back();
  };
  const unsubscribe = store.subscribe(state => {
    const before = previous;
    previous = state;
    if (restoring) {
      if (state.activeScreen === before.activeScreen || state.activeScreen === current.screen) return;
      // An explicit route change while async restore is pending supersedes it.
      ++sequence; restoring = false; closing = false;
    }
    if (state.activeScreen === before.activeScreen) {
      if (state.activeScreen === R3_ROUTES.READER && state.activeBookId !== before.activeBookId)
        write({ ...current, bookId: state.activeBookId });
      return;
    }
    if (isSettings(state.activeScreen)) {
      if (!isSettings(before.activeScreen)) {
        const origin = fromState(before, current);
        // Upgrade legacy Reader entries before recording the origin identity.
        write(origin);
        session = { id: id(), origin };
        write({ ...clean(origin), id: id(), step: origin.step + 1,
          screen: state.activeScreen, settingsSession: session }, true);
      } else write({ ...current, screen: state.activeScreen });
      return;
    }
    if (isSettings(before.activeScreen) && session) {
      const origin = session.origin;
      if (state.activeScreen === origin.screen
        && (state.activeScreen !== R3_ROUTES.READER || state.activeBookId === origin.bookId)) {
        dismiss(); return;
      }
      session = null;
    }
    const entry = fromState(state, current);
    if (state.activeScreen === R3_ROUTES.READER) {
      entry.id = id(); entry.step = (current.step ?? 0) + 1;
      entry.returnScreen = before.activeScreen; entry.returnStep = current.step ?? 0;
      write(entry, true);
    } else write(entry);
  });
  const normalize = (entry, fallback) => {
    if (!valid(entry)) return null;
    if (!isSettings(entry.screen)) return entry;
    const active = entry.settingsSession;
    const origin = valid(active?.origin) && !isSettings(active.origin.screen) ? active.origin
      : valid(fallback) && !isSettings(fallback.screen) ? fallback : { screen: R3_ROUTES.HOME };
    return { ...clean(origin), step: entry.step ?? current.step,
      consumedSettings: { id: active?.id || id(), originId: origin.id } };
  };
  const restore = (entry, fallback) => {
    const target = normalize(entry, fallback);
    if (!target) return Promise.resolve();
    controller.cancelNavigation?.();
    const token = ++sequence;
    restoring = true;
    write(target);
    pending = pending.catch(() => {}).then(async () => {
      if (token !== sequence) return;
      const state = store.getState();
      if (isSettings(state.activeScreen) && state.settings?.returnScreen === target.screen
        && (target.screen !== R3_ROUTES.READER || state.activeBookId === target.bookId))
        await applyRestore(() => controller.returnFromSettings());
      else if (target.screen === R3_ROUTES.READER && target.bookId) {
        if (state.activeScreen !== R3_ROUTES.READER || state.activeBookId !== target.bookId
          || state.reader.status !== "ready") await applyRestore(() => controller.selectBook(target.bookId));
      } else if (state.activeScreen !== target.screen) await applyRestore(() => controller.navigate(target.screen, { restoreShellScroll: true }));
    }).finally(() => { if (token === sequence) { restoring = false; closing = false; } });
    return pending;
  };
  const onPopState = event => {
    const from = current, incoming = event.state?.interleafR3;
    trace("POPSTATE", "history", "browser-navigation", {
      incomingScreen: valid(incoming) ? incoming.screen : null,
      incomingStep: Number.isInteger(incoming?.step) ? incoming.step : null,
      direction: Number.isInteger(incoming?.step) && Number.isInteger(from.step)
        ? Math.sign(incoming.step - from.step) : null,
      hasUAVisualTransition: event.hasUAVisualTransition === true
    });
    controller.cancelNavigation?.();
    const wasSettings = isSettings(store.getState().activeScreen);
    const fallback = session?.origin || fromState(store.getState(), from);
    session = null;
    // A consumed slot duplicates a Reader visit. Back from that duplicate goes
    // directly to the recorded visit origin; Back while Settings is visible
    // always stops at its immediate origin instead.
    if (!closing && !wasSettings && from.id && incoming?.id === from.id
      && Number.isInteger(incoming.step) && Number.isInteger(from.returnStep)
      && incoming.step < from.step && incoming.step > from.returnStep) {
      current = incoming;
      history.go(from.returnStep - incoming.step);
      return;
    }
    void restore(incoming, fallback);
  };
  windowRef.addEventListener("popstate", onPopState);
  return {
    restoreInitial: () => valid(initial) ? restore(initial, null) : Promise.resolve(),
    whenSettled: () => pending,
    snapshot: () => ({ sequence, restoring, closing, screen: current.screen, step: current.step,
      consumedSettings: Boolean(current.consumedSettings), settingsSession: Boolean(session) }),
    backFromSettings() {
      if (!isSettings(store.getState().activeScreen)) return false;
      dismiss(); return true;
    },
    back() {
      const entry = current;
      if (entry.screen !== R3_ROUTES.READER || !entry.returnScreen) return false;
      if (entry.consumedSettings && Number.isInteger(entry.returnStep) && entry.step > entry.returnStep)
        history.go(entry.returnStep - entry.step);
      else history.back();
      return true;
    },
    destroy() { ++sequence; controller.cancelNavigation?.(); unsubscribeNavigation?.();
      unsubscribe(); windowRef.removeEventListener("popstate", onPopState); }
  };
}
