export const R3_SHELL_THEME = Object.freeze({
  light: Object.freeze({
    themeColor: "#f6f7f4",
    background: "#f6f7f4"
  }),
  dark: Object.freeze({
    themeColor: "#141a22",
    background: "#141a22"
  })
});

export function isStandaloneDisplay(windowRef = globalThis) {
  const navigatorRef = windowRef?.navigator;
  if (navigatorRef?.standalone === true) {
    return true;
  }

  try {
    if (windowRef?.matchMedia?.("(display-mode: standalone)")?.matches) {
      return true;
    }
    if (windowRef?.matchMedia?.("(display-mode: fullscreen)")?.matches) {
      return true;
    }
  } catch {
    // matchMedia can throw in non-browser test harnesses.
  }

  return false;
}

export function isLikelyIPhone(windowRef = globalThis) {
  const navigatorRef = windowRef?.navigator;
  if (!navigatorRef) {
    return false;
  }

  const userAgent = String(navigatorRef.userAgent || "");
  if (/iPhone|iPod/i.test(userAgent)) {
    return true;
  }

  // iPadOS 13+ may report as MacIntel while remaining a touch device.
  return navigatorRef.platform === "MacIntel"
    && Number(navigatorRef.maxTouchPoints || 0) > 1;
}

export function shouldShowImmersiveInstallGuidance(windowRef = globalThis) {
  return isStandaloneDisplay(windowRef) || isLikelyIPhone(windowRef);
}

export function applyDisplayModeDataset(documentRef, windowRef = documentRef?.defaultView) {
  const standalone = isStandaloneDisplay(windowRef);
  const mode = standalone ? "standalone" : "browser";
  documentRef?.documentElement?.setAttribute("data-display-mode", mode);
  documentRef?.body?.setAttribute("data-display-mode", mode);
  return standalone;
}

export function resolveShellTheme(theme) {
  return theme === "dark" ? R3_SHELL_THEME.dark : R3_SHELL_THEME.light;
}

/**
 * Sync document chrome (theme-color / body wash) for the active shell surface.
 * Reader Appearance Dark must not be applied through html/body datasets that
 * restyle Home, Library, Settings, or the language gate.
 */
export function syncDocumentTheme(documentRef, theme = "light") {
  if (!documentRef) {
    return null;
  }

  const resolved = resolveShellTheme(theme);
  const root = documentRef.documentElement;
  const body = documentRef.body;

  if (root) {
    delete root.dataset.readerTheme;
    root.removeAttribute?.("data-reader-theme");
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
  }

  if (body) {
    delete body.dataset.readerTheme;
    body.removeAttribute?.("data-reader-theme");
    body.style.backgroundColor = resolved.background;
  }

  ensureThemeColorMeta(documentRef).setAttribute("content", resolved.themeColor);
  return resolved;
}

export function getEffectiveThemeColorMeta(documentRef) {
  if (!documentRef?.querySelectorAll) {
    return null;
  }

  const metas = [...documentRef.querySelectorAll('meta[name="theme-color"]')];
  return metas.find(meta => {
    const media = meta.getAttribute("media");
    if (!media) {
      return true;
    }
    try {
      return documentRef.defaultView?.matchMedia?.(media)?.matches === true;
    } catch {
      return false;
    }
  }) || metas[0] || null;
}

function ensureThemeColorMeta(documentRef) {
  const head = documentRef.head || documentRef.getElementsByTagName?.("head")?.[0];
  const metas = [...(documentRef.querySelectorAll?.('meta[name="theme-color"]') || [])];
  let active = metas.find(meta => meta.getAttribute?.("data-r3-theme-color") === "active")
    || metas.find(meta => !meta.getAttribute?.("media"));

  if (!active) {
    if (typeof documentRef.createElement !== "function" || !head) {
      return {
        setAttribute() {}
      };
    }
    active = documentRef.createElement("meta");
    active.setAttribute?.("name", "theme-color");
    active.setAttribute?.("content", R3_SHELL_THEME.light.themeColor);
    if (typeof head.insertBefore === "function") {
      head.insertBefore(active, head.firstChild || head.children?.[0] || null);
    } else {
      head.appendChild?.(active);
    }
  }

  active.setAttribute?.("data-r3-theme-color", "active");
  active.removeAttribute?.("media");

  for (const meta of metas) {
    if (meta !== active) {
      meta.remove?.();
    }
  }

  const firstChild = head?.firstChild || head?.children?.[0] || null;
  if (head && active.parentNode === head && firstChild !== active && typeof head.insertBefore === "function") {
    head.insertBefore(active, firstChild);
  }

  return active;
}
