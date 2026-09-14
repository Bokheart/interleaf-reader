function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatAdapterStatus(adapterStatus = {}) {
  return Object.entries(adapterStatus)
    .map(([name, isReady]) => `${name}: ${isReady ? "ready" : "pending"}`)
    .join(", ");
}

export function renderDiagnosticMarkup(state = {}) {
  const adapterStatus = formatAdapterStatus(state.adapterStatus);
  const loadingLabel = state.loading?.isLoading
    ? `Loading ${state.loading.operation || "operation"}`
    : "Idle";
  const errorLabel = state.error?.message || "None";

  return `
    <section class="r3-diagnostic-shell" aria-labelledby="r3DiagnosticTitle">
      <p class="r3-diagnostic-kicker">Development entry</p>
      <h1 id="r3DiagnosticTitle">R3 development foundation</h1>
      <p class="r3-diagnostic-note">
        Diagnostic placeholder only. Final R3 screens are intentionally out of scope for this entry.
      </p>
      <dl class="r3-diagnostic-grid">
        <div>
          <dt>Route</dt>
          <dd>${escapeHtml(state.activeScreen)}</dd>
        </div>
        <div>
          <dt>Initialized</dt>
          <dd>${state.initialized ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Saved books</dt>
          <dd>${Number(state.savedBookCount) || 0}</dd>
        </div>
        <div>
          <dt>Active book</dt>
          <dd>${escapeHtml(state.activeBookId || "None")}</dd>
        </div>
        <div>
          <dt>Chapter</dt>
          <dd>${escapeHtml(state.activeChapterId || "None")} (${state.activeChapterIndex})</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>${escapeHtml(state.activeReadingMode)}</dd>
        </div>
        <div>
          <dt>Overlay</dt>
          <dd>${escapeHtml(state.openOverlay || "None")}</dd>
        </div>
        <div>
          <dt>Loading</dt>
          <dd>${escapeHtml(loadingLabel)}</dd>
        </div>
        <div>
          <dt>Error</dt>
          <dd>${escapeHtml(errorLabel)}</dd>
        </div>
      </dl>
      <p class="r3-diagnostic-service">${escapeHtml(adapterStatus)}</p>
    </section>
  `;
}

export function createDiagnosticView(documentRef, state = {}) {
  const wrapper = documentRef.createElement("div");
  wrapper.className = "r3-diagnostic-mount";
  wrapper.textContent = renderDiagnosticMarkup(state).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return wrapper;
}
