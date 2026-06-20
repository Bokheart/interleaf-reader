const VOCABULARY_ITEMS = [
  {
    index: 1,
    word: "figure out",
    pos: "phr. v.",
    meaning: "弄清楚；理解",
    status: "known",
    details: [{ tag: "EN", text: "to understand or solve something" }],
    contextCount: 3,
    contextExpanded: false
  },
  {
    index: 2,
    word: "anxious",
    pos: "adj.",
    meaning: "焦虑的；担心的",
    status: "learning",
    details: [
      { tag: "EN", text: "feeling worried or nervous about something" },
      { tag: "IELTS", text: "anxious about the result / feel anxious" },
      { tag: "USE", text: "Often describes tension before an event." }
    ],
    contextCount: 2,
    contextExpanded: true,
    quote: 'He felt <strong>anxious</strong> about the interview, but prepared carefully and stayed calm.'
  },
  {
    index: 3,
    word: "relentless",
    pos: "adj.",
    meaning: "不间断的；持续的",
    status: "hidden",
    details: [{ tag: "EN", text: "continuing without pause or weakening" }],
    contextCount: 1,
    contextExpanded: false
  },
  {
    index: 4,
    word: "linger",
    pos: "v.",
    meaning: "逗留；徘徊",
    status: "none",
    details: [{ tag: "EN", text: "to stay in a place longer than necessary" }],
    contextCount: 2,
    contextExpanded: false
  },
  {
    index: 5,
    word: "vulnerable",
    pos: "adj.",
    meaning: "脆弱的；易受影响的",
    status: "learning",
    details: [{ tag: "EN", text: "able to be hurt or influenced" }],
    contextCount: 4,
    contextExpanded: false
  }
];

const previewState = {
  hideMeanings: false,
  focusedWord: null,
  activeFilter: "all"
};

const FILTERS = [
  { id: "all", label: "All 14" },
  { id: "ielts", label: "IELTS 9" },
  { id: "phrases", label: "Phrases 3" },
  { id: "slang", label: "Slang 2" }
];

const ICONS = {
  back: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 010 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  known: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M8 12.2l2.2 2.2L16 9.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  saveOutline: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10v16l-5-3.5L7 20V4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  saveFilled: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10v16l-5-3.5L7 20V4z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  hide: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" stroke-width="1.7"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  quote: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7h4v7H6V9c0-1.1.9-2 2-2H7zm10 0h4v7h-5V9c0-1.1.9-2 2-2h-1z" fill="currentColor"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11.2V16h6v-1.8A6 6 0 0012 3z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  signal: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="14" width="3" height="7" rx="1"/><rect x="8" y="11" width="3" height="10" rx="1"/><rect x="13" y="8" width="3" height="13" rx="1"/><rect x="18" y="5" width="3" height="16" rx="1"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5a11 11 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.5 15.5a6.5 6.5 0 017 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>`,
  battery: `<svg viewBox="0 0 28 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="22" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/><rect x="3.5" y="3.5" width="16" height="7" rx="1.5" fill="currentColor"/><path d="M24.5 5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

function tagClass(tag) {
  if (tag === "EN") {
    return "tag-en";
  }
  if (tag === "IELTS") {
    return "tag-ielts";
  }
  return "tag-use";
}

function statusIcon(item, action, label, iconType) {
  const statusValue = action === "save" ? "learning" : action;
  const active = item.status === statusValue;
  const classes = ["status-icon"];
  if (active) {
    classes.push("is-active");
  }
  if (active) {
    classes.push("is-filled");
  }

  let icon = ICONS[iconType];
  if (iconType === "save") {
    icon = active ? ICONS.saveFilled : ICONS.saveOutline;
  }

  return `
    <button
      type="button"
      class="${classes.join(" ")}"
      data-status-action="${action}"
      data-word="${item.word}"
      aria-label="${label} ${item.word}"
      aria-pressed="${active}"
    >${icon}</button>
  `;
}

function renderDetailRows(details) {
  return details.map((detail) => `
    <div class="detail-row">
      <span class="tag ${tagClass(detail.tag)}">${detail.tag}</span>
      <span class="detail-text">${detail.text}</span>
    </div>
  `).join("");
}

function renderStatusControls(item) {
  return `
    <div class="word-status-icons" aria-label="Vocabulary status for ${item.word}">
      ${statusIcon(item, "known", "Mark as Known:", "known")}
      ${statusIcon(item, "save", "Save for Learning:", "save")}
      ${statusIcon(item, "hidden", "Hide:", "hide")}
    </div>
  `;
}

function renderCard(item) {
  const isFocused = previewState.hideMeanings && previewState.focusedWord === item.word;
  const showDetails = !previewState.hideMeanings || isFocused;
  const contextChevron = item.contextExpanded ? ICONS.chevronDown : ICONS.chevronRight;
  const contextPanel = showDetails && item.contextExpanded ? `
    <div class="context-panel">
      <div class="quote-icon">${ICONS.quote}</div>
      <p class="quote-text">${item.quote}</p>
      <button type="button" class="passage-button" aria-label="Go to this passage">
        Go to this passage
        ${ICONS.chevronRight}
      </button>
    </div>
  ` : "";
  const cardClasses = ["vocab-card"];

  if (!showDetails) {
    cardClasses.push("is-collapsed");
  }

  if (isFocused) {
    cardClasses.push("is-focused");
  }

  const disclosureAttributes = previewState.hideMeanings
    ? `role="button" tabindex="0" aria-expanded="${isFocused}" aria-label="${isFocused ? "Collapse" : "Inspect"} meanings for ${item.word}"`
    : "";

  return `
    <article class="${cardClasses.join(" ")}" data-word="${item.word}" ${disclosureAttributes}>
      <div class="vocab-main">
        <div class="vocab-left">
          <div class="word-line">
            <span class="word-index">${item.index}</span>
            <span class="word-text">${item.word}</span>
            ${showDetails ? `<button type="button" class="speaker-button" aria-label="Play pronunciation for ${item.word}">
              ${ICONS.speaker}
            </button>` : ""}
          </div>
        </div>
        <div class="vocab-right">
          <div class="right-top">
            ${showDetails ? `<p class="meaning-line"><span class="pos">${item.pos}</span>${item.meaning}</p>` : ""}
            ${renderStatusControls(item)}
          </div>
          ${showDetails ? `<div class="detail-rows">
            ${renderDetailRows(item.details)}
          </div>
          ${contextPanel}
          <div class="context-row">
            <span class="context-link">
              Context ${item.contextCount}x
              ${contextChevron}
            </span>
          </div>` : ""}
        </div>
      </div>
    </article>
  `;
}

function matchesFilter(item, filterId) {
  if (filterId === "ielts") {
    return item.details.some((detail) => detail.tag === "IELTS");
  }

  if (filterId === "phrases") {
    return item.word.includes(" ");
  }

  if (filterId === "slang") {
    return item.details.some((detail) => detail.tag === "SLANG");
  }

  return true;
}

function getVisibleItems() {
  return VOCABULARY_ITEMS.filter((item) => matchesFilter(item, previewState.activeFilter));
}

function renderFilters() {
  return FILTERS.map((filter) => `
    <button
      type="button"
      class="chip${filter.id === previewState.activeFilter ? " is-selected" : ""}"
      data-filter="${filter.id}"
      aria-pressed="${filter.id === previewState.activeFilter}"
    >${filter.label}</button>
  `).join("");
}

function renderVocabularyList() {
  const visibleItems = getVisibleItems();

  if (!visibleItems.length) {
    return `<p class="filter-empty">No sample words match this filter.</p>`;
  }

  return visibleItems.map(renderCard).join("");
}

function renderApp(root) {
  root.innerHTML = `
    <div class="app-shell">
      <div class="status-bar">
        <span class="status-time">9:41</span>
        <div class="dynamic-island" aria-hidden="true"></div>
        <div class="status-bar-icons">
          <span class="signal-icon">${ICONS.signal}</span>
          <span class="wifi-icon">${ICONS.wifi}</span>
          <span class="battery-icon">${ICONS.battery}</span>
        </div>
      </div>

      <div class="preview-screen">
        <header class="top-nav">
          <button type="button" class="icon-button" aria-label="Back">${ICONS.back}</button>
          <div class="nav-title-block">
            <h1 class="nav-title">Vocabulary Preview</h1>
            <p class="nav-subtitle">Chapter 35 · 14 words</p>
          </div>
          <button type="button" class="icon-button" aria-label="Close">${ICONS.close}</button>
        </header>

        <div class="instruction-row">
          <p class="instruction-text">Preview these words before reading.</p>
          <div class="toggle-group">
            <span class="toggle-label">Hide meanings</span>
            <button
              type="button"
              class="toggle${previewState.hideMeanings ? " is-on" : ""}"
              role="switch"
              aria-checked="${previewState.hideMeanings}"
              aria-label="Hide meanings"
              data-action="toggle-meanings"
            ></button>
          </div>
        </div>

        <div class="filter-row" aria-label="Vocabulary filters">
          ${renderFilters()}
        </div>

        <div class="vocab-scroll">
          <div class="vocab-list">
            ${renderVocabularyList()}
          </div>
        </div>

        <footer class="tips-bar">
          <div class="tips-content">
            <div class="tips-left">
              ${ICONS.bulb}
              <p class="tips-text">Tip: Tap the icons to mark a word quickly.</p>
            </div>
            <div class="tips-legend">
              <span class="legend-item">${ICONS.known} Known</span>
              <span class="legend-item">${ICONS.saveOutline} Save</span>
              <span class="legend-item">${ICONS.hide} Hide</span>
            </div>
          </div>
          <div class="home-indicator" aria-hidden="true"></div>
        </footer>
      </div>
    </div>
  `;
}

function toggleFocusedWord(word) {
  previewState.focusedWord = previewState.focusedWord === word ? null : word;
}

function setVocabularyStatus(word, action) {
  const item = VOCABULARY_ITEMS.find((candidate) => candidate.word === word);

  if (!item) {
    return;
  }

  item.status = action === "save" ? "learning" : action;
}

function bindInteractions(root) {
  root.addEventListener("click", (event) => {
    const statusButton = event.target.closest("[data-status-action]");

    if (statusButton) {
      event.stopPropagation();
      setVocabularyStatus(statusButton.dataset.word, statusButton.dataset.statusAction);
      renderApp(root);
      return;
    }

    const filterButton = event.target.closest("[data-filter]");

    if (filterButton) {
      previewState.activeFilter = filterButton.dataset.filter;
      previewState.focusedWord = null;
      renderApp(root);
      return;
    }

    if (event.target.closest("[data-action='toggle-meanings']")) {
      previewState.hideMeanings = !previewState.hideMeanings;
      previewState.focusedWord = null;
      renderApp(root);
      return;
    }

    if (!previewState.hideMeanings || event.target.closest("button")) {
      return;
    }

    const card = event.target.closest(".vocab-card[data-word]");

    if (card) {
      toggleFocusedWord(card.dataset.word);
      renderApp(root);
    }
  });

  root.addEventListener("keydown", (event) => {
    if (!previewState.hideMeanings || !["Enter", " "].includes(event.key) || event.target.closest("button")) {
      return;
    }

    const card = event.target.closest(".vocab-card[data-word]");

    if (!card) {
      return;
    }

    event.preventDefault();
    toggleFocusedWord(card.dataset.word);
    renderApp(root);
    root.querySelector(`.vocab-card[data-word="${card.dataset.word}"]`)?.focus();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("app");
  renderApp(root);
  bindInteractions(root);
});
