import { getLanguageChoices } from "../../i18n.js";
import { createElement, createIconButton } from "../components/dom.js";
import { R3_ROUTES } from "../routes.js";

export function createLanguageChoices(documentRef, settings, t, options = {}) {
  const group = createElement(documentRef, "div", {
    className: options.className || "r3-language-choice-list",
    attrs: {
      role: "group",
      "aria-label": t("r3.settings.languageChoices")
    }
  });

  getLanguageChoices(settings?.uiLanguage).forEach(choice => {
    const button = createElement(documentRef, "button", {
      className: `r3-language-choice${choice.selected ? " is-selected" : ""}`,
      text: choice.label,
      attrs: {
        type: "button",
        "aria-pressed": choice.selected ? "true" : "false"
      },
      dataset: {
        action: "set-ui-language",
        uiLanguage: choice.value
      },
      disabled: settings?.busy
    });
    group.appendChild(button);
  });

  return group;
}

export function createSettingsView(documentRef, state, t) {
  const settings = state.settings || {};
  const view = createElement(documentRef, "div", {
    className: "r3-screen r3-settings-screen",
    attrs: { "data-screen": "settings" }
  });
  const header = createElement(documentRef, "header", { className: "r3-settings-header" });
  header.appendChild(createIconButton(documentRef, {
    className: "r3-icon-button r3-settings-back",
    icon: "chevronLeft",
    label: t("settings.backHome"),
    dataset: { action: "navigate", route: R3_ROUTES.HOME }
  }));
  header.appendChild(createElement(documentRef, "h1", { text: t("settings.title") }));
  view.appendChild(header);

  const languageSection = createElement(documentRef, "section", { className: "r3-settings-section" });
  languageSection.appendChild(createElement(documentRef, "p", {
    className: "r3-settings-section-label",
    text: t("settings.language.title")
  }));
  languageSection.appendChild(createElement(documentRef, "h2", {
    text: t("settings.language.label")
  }));
  languageSection.appendChild(createLanguageChoices(documentRef, settings, t));
  if (settings.error?.message) {
    languageSection.appendChild(createElement(documentRef, "p", {
      className: "r3-error-text",
      text: settings.error.message,
      attrs: { role: "alert" }
    }));
  }
  view.appendChild(languageSection);

  const privacySection = createElement(documentRef, "section", { className: "r3-settings-section" });
  privacySection.appendChild(createElement(documentRef, "h2", {
    text: t("r3.settings.localData.title")
  }));
  privacySection.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: t("r3.settings.localData.body")
  }));
  view.appendChild(privacySection);
  return view;
}
