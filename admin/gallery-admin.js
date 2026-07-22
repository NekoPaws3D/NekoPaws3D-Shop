"use strict";

(function () {
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];

  function ensureGallery() {
    if (!storeData) return [];
    storeData.orderGallery = Array.isArray(storeData.orderGallery) ? storeData.orderGallery : [];
    return storeData.orderGallery;
  }

  function nextGalleryId() {
    return Math.max(0, ...ensureGallery().map(entry => Number(entry.id) || 0)) + 1;
  }

  function renderGalleryImages(card, entry) {
    const list = card.querySelector(".gallery-image-list");
    list.innerHTML = "";

    (entry.images || []).forEach((src, index) => {
      const tile = document.createElement("div");
      tile.className = "image-tile";
      tile.innerHTML = `
        <img src="../${src}" alt="Galeriebild">
        <small>${src}</small>
        <div>
          <button type="button" class="outline-btn gallery-image-first">Als Vorschaubild</button>
          <button type="button" class="outline-btn danger gallery-image-remove">Entfernen</button>
        </div>`;

      tile.querySelector(".gallery-image-first").onclick = () => {
        const selected = entry.images.splice(index, 1)[0];
        entry.images.unshift(selected);
        entry.image = selected;
        renderGalleryImages(card, entry);
      };

      tile.querySelector(".gallery-image-remove").onclick = () => {
        entry.images.splice(index, 1);
        entry.image = entry.images[0] || "";
        renderGalleryImages(card, entry);
      };

      list.appendChild(tile);
    });
  }

  async function uploadGalleryImages(event, entry, card) {
    const files = [...event.target.files];
    if (!files.length) return;

    event.target.disabled = true;
    setStatus("#save-status", `${files.length} Galeriebild(er) werden hochgeladen …`);

    try {
      for (const file of files) {
        const filename = safeFileName(file.name).replace("produkt", "referenz");
        const path = `assets/gallery/${filename}`;
        const content = await fileToBase64(file);

        await githubFetch(`/contents/${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Galeriebild ${filename} hochladen`,
            content,
            branch: BRANCH
          })
        });

        entry.images = Array.isArray(entry.images) ? entry.images : [];
        entry.images.push(path);
        entry.image = entry.images[0];
      }

      renderGalleryImages(card, entry);
      setStatus("#save-status", "Galeriebilder hochgeladen. Jetzt „Alles veröffentlichen“ klicken.", "success");
    } catch (error) {
      setStatus("#save-status", `Galerie-Upload fehlgeschlagen: ${error.message}`, "error");
    } finally {
      event.target.disabled = false;
      event.target.value = "";
    }
  }

  function createGalleryEditor(entry) {
    const fragment = qs("#gallery-template").content.cloneNode(true);
    const card = fragment.querySelector(".gallery-editor-card");
    card.dataset.id = entry.id;

    const set = (selector, value) => {
      const element = card.querySelector(selector);
      if (element.type === "checkbox") element.checked = Boolean(value);
      else element.value = value ?? "";
    };

    set(".ga-id", entry.id);
    set(".ga-sort", entry.sort);
    set(".ga-title", entry.title);
    set(".ga-category", entry.category || "Zeichnung");
    set(".ga-date", entry.date);
    set(".ga-customer", entry.customer);
    set(".ga-visible", entry.visible !== false);
    set(".ga-featured", entry.featured);
    set(".ga-consent", entry.consent);
    set(".ga-description", entry.description);
    set(".ga-tags", Array.isArray(entry.tags) ? entry.tags.join(", ") : entry.tags);

    card.querySelector(".gallery-heading").textContent = entry.title || "Neuer Referenzauftrag";
    renderGalleryImages(card, entry);

    card.querySelector(".gallery-image-upload").onchange = event =>
      uploadGalleryImages(event, entry, card);

    card.querySelector(".delete-gallery").onclick = () => {
      if (!confirm(`Referenz „${entry.title || "ohne Titel"}“ löschen?`)) return;
      readGalleryEditors();
      storeData.orderGallery = ensureGallery().filter(item => item !== entry);
      renderGalleryEditors();
    };

    card.querySelector(".duplicate-gallery").onclick = () => {
      readGalleryEditors();
      const copy = structuredClone(entry);
      copy.id = nextGalleryId();
      copy.title = `${copy.title || "Referenz"} (Kopie)`;
      copy.sort = ensureGallery().length + 1;
      copy.visible = false;
      ensureGallery().push(copy);
      renderGalleryEditors();
    };

    return card;
  }

  window.renderGalleryEditors = function () {
    const box = qs("#gallery-editor");
    if (!box || !storeData) return;
    box.innerHTML = "";

    ensureGallery()
      .sort((a, b) => (a.sort || 999) - (b.sort || 999))
      .forEach(entry => box.appendChild(createGalleryEditor(entry)));
  };

  window.readGalleryEditors = function () {
    if (!storeData) return;
    const oldEntries = ensureGallery();

    storeData.orderGallery = qsa(".gallery-editor-card").map(card => {
      const old = oldEntries.find(entry => String(entry.id) === String(card.dataset.id)) || {};
      const value = selector => card.querySelector(selector).value.trim();

      return {
        ...old,
        id: Number(value(".ga-id")) || nextGalleryId(),
        sort: Number(value(".ga-sort")) || 999,
        title: value(".ga-title"),
        category: value(".ga-category"),
        date: value(".ga-date"),
        customer: value(".ga-customer"),
        visible: card.querySelector(".ga-visible").checked,
        featured: card.querySelector(".ga-featured").checked,
        consent: card.querySelector(".ga-consent").checked,
        description: value(".ga-description"),
        tags: value(".ga-tags").split(",").map(tag => tag.trim()).filter(Boolean),
        images: Array.isArray(old.images) ? old.images : [],
        image: old.images?.[0] || old.image || ""
      };
    }).filter(entry => entry.title || entry.description || entry.images.length);
  };

  function addGalleryEntry() {
    readGalleryEditors();
    const id = nextGalleryId();

    ensureGallery().unshift({
      id,
      sort: ensureGallery().length + 1,
      title: "Neuer Referenzauftrag",
      category: "Zeichnung",
      date: new Date().toISOString().slice(0, 10),
      customer: "",
      description: "",
      tags: [],
      images: [],
      image: "",
      featured: false,
      visible: false,
      consent: false
    });

    renderGalleryEditors();
    if (typeof switchTab === "function") switchTab("gallery");
  }

  function install() {
    qs("#add-gallery-btn")?.addEventListener("click", addGalleryEntry);

    if (typeof renderAll === "function") {
      const originalRenderAll = renderAll;
      window.renderAll = function () {
        originalRenderAll();
        renderGalleryEditors();
      };
    }

    if (typeof saveAll === "function") {
      const originalSaveAll = saveAll;
      window.saveAll = async function () {
        readGalleryEditors();
        return originalSaveAll();
      };
    }

    // Falls der Admin beim Laden bereits angemeldet ist.
    if (storeData) renderGalleryEditors();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
