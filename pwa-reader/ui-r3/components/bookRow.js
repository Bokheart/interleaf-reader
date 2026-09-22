import {
  createBookCover,
  createElement,
  createIcon,
  createProgressBar,
  getProgressLabel,
  getProgressPercent
} from "./dom.js";
import { createTranslator } from "../../i18n.js";

export function createBookRow(documentRef, book = {}, t = createTranslator("en")) {
  const percent = getProgressPercent(book);
  const row = createElement(documentRef, "button", {
    className: "r3-book-row",
    attrs: {
      type: "button"
    },
    dataset: {
      action: "select-book",
      bookKey: book.bookKey
    }
  });

  row.appendChild(createBookCover(documentRef, book.title || t("r3.common.untitledBook")));

  const body = createElement(documentRef, "span", { className: "r3-book-row-body" });
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-title",
    text: book.title || t("r3.common.untitledBook")
  }));
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-meta",
    text: book.author || book.fileName || t("r3.common.localEpub")
  }));
  body.appendChild(createProgressBar(documentRef, percent));
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-progress-label",
    text: getProgressLabel(book, t)
  }));

  const percentLabel = createElement(documentRef, "span", {
    className: "r3-book-row-percent",
    text: `${percent}%`
  });
  percentLabel.appendChild(createIcon(documentRef, "arrowRight"));

  row.appendChild(body);
  row.appendChild(percentLabel);
  return row;
}
