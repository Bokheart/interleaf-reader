import { createElement, createIcon } from "./dom.js";
import { R3_ROUTES } from "../routes.js";

const NAV_ITEMS = Object.freeze([
  { route: R3_ROUTES.HOME, label: "Home", icon: "home", enabled: true },
  { route: R3_ROUTES.LIBRARY, label: "Library", icon: "library", enabled: true },
  { route: R3_ROUTES.VOCABULARY, label: "Vocabulary", icon: "vocabulary", enabled: false }
]);

export function createBottomNavigation(documentRef, activeScreen) {
  const nav = createElement(documentRef, "nav", {
    className: "r3-bottom-nav",
    attrs: {
      "aria-label": "Primary"
    }
  });

  NAV_ITEMS.forEach((item) => {
    const isActive = activeScreen === item.route;
    const button = createElement(documentRef, "button", {
      className: `r3-nav-item${isActive ? " is-active" : ""}`,
      attrs: {
        type: "button",
        "aria-current": isActive ? "page" : undefined,
        "aria-disabled": item.enabled ? undefined : "true",
        title: item.enabled ? item.label : `${item.label} unavailable in R3 shell`
      },
      dataset: {
        action: item.enabled ? "navigate" : "unsupported",
        route: item.route
      },
      disabled: !item.enabled
    });
    button.appendChild(createIcon(documentRef, item.icon));
    button.appendChild(createElement(documentRef, "span", { text: item.label }));
    nav.appendChild(button);
  });

  return nav;
}
