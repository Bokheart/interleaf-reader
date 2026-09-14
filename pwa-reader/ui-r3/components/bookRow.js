import {
  createBookCover,
  createElement,
  createIcon,
  createProgressBar,
  getProgressLabel,
  getProgressPercent
} from "./dom.js";

export function createBookRow(documentRef, book = {}) {
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

  row.appendChild(createBookCover(documentRef, book.title || "Untitled Book"));

  const body = createElement(documentRef, "span", { className: "r3-book-row-body" });
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-title",
    text: book.title || "Untitled Book"
  }));
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-meta",
    text: book.author || book.fileName || "Local EPUB"
  }));
  body.appendChild(createProgressBar(documentRef, percent));
  body.appendChild(createElement(documentRef, "span", {
    className: "r3-book-row-progress-label",
    text: getProgressLabel(book)
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
