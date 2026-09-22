import { createElement, createIcon } from "./dom.js";
import { R3_ROUTES } from "../routes.js";
import { createTranslator } from "../../i18n.js";

const NAV_ITEMS = Object.freeze([
  { route: R3_ROUTES.HOME, labelKey: "r3.nav.home", icon: "home", enabled: true },
  { route: R3_ROUTES.LIBRARY, labelKey: "r3.nav.library", icon: "library", enabled: true },
  { route: R3_ROUTES.VOCABULARY, labelKey: "r3.nav.vocabulary", icon: "vocabulary", enabled: true }
]);

export function createBottomNavigation(documentRef, activeScreen, t = createTranslator("en")) {
  const nav = createElement(documentRef, "nav", {
    className: "r3-bottom-nav",
    attrs: {
      "aria-label": t("r3.nav.primary")
    }
  });

  NAV_ITEMS.forEach((item) => {
    const isActive = activeScreen === item.route;
    const label = t(item.labelKey);
    const button = createElement(documentRef, "button", {
      className: `r3-nav-item${isActive ? " is-active" : ""}`,
      attrs: {
        type: "button",
        "aria-current": isActive ? "page" : undefined,
        "aria-disabled": item.enabled ? undefined : "true",
        title: label
      },
      dataset: {
        action: item.enabled ? "navigate" : "unsupported",
        route: item.route
      },
      disabled: !item.enabled
    });
    button.appendChild(createIcon(documentRef, item.icon));
    button.appendChild(createElement(documentRef, "span", { text: label }));
    nav.appendChild(button);
  });

  return nav;
}
