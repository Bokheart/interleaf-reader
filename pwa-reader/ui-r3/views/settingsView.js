import { getLanguageChoices } from "../../i18n.js";
import { createElement, createIconButton } from "../components/dom.js";
import { R3_ROUTES } from "../routes.js";
import {
  isStandaloneDisplay,
  shouldShowImmersiveInstallGuidance
} from "../standaloneDisplay.js";

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
    label: settings.returnScreen === R3_ROUTES.READER
      ? t("r3.settings.backReader")
      : settings.returnScreen === R3_ROUTES.LIBRARY ? t("r3.settings.backLibrary")
        : !settings.returnScreen || settings.returnScreen === R3_ROUTES.HOME
          ? t("settings.backHome") : t("r3.settings.returnOrigin"),
    dataset: { action: "settings-return" }
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

  const windowRef = documentRef.defaultView;
  if (shouldShowImmersiveInstallGuidance(windowRef)) {
    const standalone = isStandaloneDisplay(windowRef);
    const immersiveSection = createElement(documentRef, "section", {
      className: "r3-settings-section",
      attrs: { "data-role": "r3-immersive-install" }
    });
    immersiveSection.appendChild(createElement(documentRef, "h2", {
      text: t(standalone
        ? "r3.settings.immersive.standaloneTitle"
        : "r3.settings.immersive.installTitle")
    }));
    immersiveSection.appendChild(createElement(documentRef, "p", {
      className: "r3-muted",
      text: t(standalone
        ? "r3.settings.immersive.standaloneBody"
        : "r3.settings.immersive.installBody")
    }));
    view.appendChild(immersiveSection);
  }
  return view;
}
