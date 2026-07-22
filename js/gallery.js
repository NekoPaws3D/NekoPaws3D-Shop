"use strict";

(function () {
  const grid = document.getElementById("gallery-grid");
  const status = document.getElementById("gallery-status");
  const search = document.getElementById("gallery-search");
  const filters = document.getElementById("gallery-filters");
  const lightbox = document.getElementById("gallery-lightbox");
  const lightboxImage = document.getElementById("gallery-lightbox-image");
  const lightboxCaption = document.getElementById("gallery-lightbox-caption");

  let entries = [];
  let activeCategory = "Alle";
  let currentImages = [];
  let currentImageIndex = 0;

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("de-DE");
  }

  function visibleEntries() {
    const term = search.value.trim().toLowerCase();
    return entries.filter(entry => {
      if (entry.visible === false || entry.consent !== true) return false;
      const categoryMatch = activeCategory === "Alle" || entry.category === activeCategory;
      const haystack = [
        entry.title, entry.description, entry.category, entry.customer,
        ...(Array.isArray(entry.tags) ? entry.tags : String(entry.tags || "").split(","))
      ].join(" ").toLowerCase();
      return categoryMatch && (!term || haystack.includes(term));
    });
  }

  function renderFilters() {
    const categories = ["Alle", ...new Set(entries
      .filter(entry => entry.visible !== false && entry.consent === true)
      .map(entry => entry.category)
      .filter(Boolean))];

    filters.innerHTML = "";
    categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = category === activeCategory ? "active" : "";
      button.textContent = category;
      button.addEventListener("click", () => {
        activeCategory = category;
        renderFilters();
        renderGallery();
      });
      filters.appendChild(button);
    });
  }

  function openLightbox(images, index, title) {
    currentImages = images;
    currentImageIndex = index;
    lightbox.dataset.title = title;
    updateLightbox();
    lightbox.classList.remove("hidden");
    document.body.classList.add("lightbox-open");
  }

  function updateLightbox() {
    const image = currentImages[currentImageIndex];
    lightboxImage.src = image;
    lightboxImage.alt = lightbox.dataset.title || "Galeriebild";
    lightboxCaption.textContent = `${lightbox.dataset.title || ""} · Bild ${currentImageIndex + 1} von ${currentImages.length}`;
    document.getElementById("gallery-lightbox-prev").hidden = currentImages.length < 2;
    document.getElementById("gallery-lightbox-next").hidden = currentImages.length < 2;
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    document.body.classList.remove("lightbox-open");
    lightboxImage.removeAttribute("src");
  }

  function renderGallery() {
    const result = visibleEntries()
      .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.sort || 999) - (b.sort || 999));

    grid.innerHTML = "";
    status.textContent = result.length
      ? `${result.length} Referenz${result.length === 1 ? "" : "en"} gefunden`
      : "Für diesen Filter wurden noch keine Referenzen veröffentlicht.";

    result.forEach(entry => {
      const images = (entry.images || []).filter(Boolean);
      const preview = images[0] || entry.image || "assets/logo.png";
      const tags = Array.isArray(entry.tags)
        ? entry.tags
        : String(entry.tags || "").split(",").map(tag => tag.trim()).filter(Boolean);

      const card = document.createElement("article");
      card.className = `gallery-card${entry.featured ? " featured" : ""}`;
      card.innerHTML = `
        <button class="gallery-card-image" type="button" aria-label="${escapeHtml(entry.title)} vergrößern">
          <img src="${escapeHtml(preview)}" alt="${escapeHtml(entry.title)}" loading="lazy">
          ${entry.featured ? '<span class="gallery-featured">Highlight</span>' : ""}
          ${images.length > 1 ? `<span class="gallery-count">📷 ${images.length}</span>` : ""}
        </button>
        <div class="gallery-card-body">
          <div class="gallery-meta">
            <span>${escapeHtml(entry.category || "Referenz")}</span>
            ${entry.date ? `<time>${escapeHtml(formatDate(entry.date))}</time>` : ""}
          </div>
          <h3>${escapeHtml(entry.title || "Referenzauftrag")}</h3>
          ${entry.customer ? `<p class="gallery-customer">Für: ${escapeHtml(entry.customer)}</p>` : ""}
          <p>${escapeHtml(entry.description || "")}</p>
          ${tags.length ? `<div class="gallery-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          <a class="outline-btn gallery-request" href="zeichenauftrag.html?reference=${encodeURIComponent(entry.title || "")}&category=${encodeURIComponent(entry.category || "")}">Ähnlichen Auftrag anfragen</a>
        </div>`;

      card.querySelector(".gallery-card-image").addEventListener("click", () => {
        openLightbox(images.length ? images : [preview], 0, entry.title || "Referenzauftrag");
      });

      grid.appendChild(card);
    });
  }

  async function loadGallery() {
    try {
      const response = await fetch(`data/store.json?gallery=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const store = await response.json();
      entries = Array.isArray(store.orderGallery) ? store.orderGallery : [];
      renderFilters();
      renderGallery();
    } catch (error) {
      console.error(error);
      status.textContent = "Die Auftragsgalerie konnte gerade nicht geladen werden.";
    }
  }

  search.addEventListener("input", renderGallery);
  document.getElementById("gallery-lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("gallery-lightbox-prev").addEventListener("click", () => {
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateLightbox();
  });
  document.getElementById("gallery-lightbox-next").addEventListener("click", () => {
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateLightbox();
  });
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (lightbox.classList.contains("hidden")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") document.getElementById("gallery-lightbox-prev").click();
    if (event.key === "ArrowRight") document.getElementById("gallery-lightbox-next").click();
  });

  loadGallery();
})();
