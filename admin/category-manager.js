"use strict";

(function () {
  const DEFAULT_CATEGORIES = [
    "Sticker",
    "Epoxidharz",
    "3D Druck",
    "Zeichenaufträge",
    "Textildruck",
    "Lasern und Gravuren",
    "Bundles",
    "FSK 18"
  ];

  const $cat = selector => document.querySelector(selector);
  const $$cat = selector => [...document.querySelectorAll(selector)];

  function slugifyCategory(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " und ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function categoryLabel(name) {
    if (name === "Lasern und Gravuren") return "Lasern & Gravuren";
    return name;
  }

  function ensureCategoryData() {
    if (typeof storeData === "undefined" || !storeData) return [];

    const productCategories = (storeData.products || [])
      .map(product => String(product.category || "").trim())
      .filter(Boolean);

    const existing = Array.isArray(storeData.categories)
      ? storeData.categories
      : [];

    const names = [...new Set([...DEFAULT_CATEGORIES, ...productCategories])];
    const byName = new Map(
      existing
        .filter(item => item && item.name)
        .map(item => [String(item.name).trim(), item])
    );

    storeData.categories = names.map((name, index) => {
      const saved = byName.get(name) || {};
      return {
        id: saved.id || slugifyCategory(name) || `kategorie-${index + 1}`,
        name,
        label: saved.label || categoryLabel(name),
        sort: Number(saved.sort) || index + 1,
        active: saved.active !== false,
        system: DEFAULT_CATEGORIES.includes(name)
      };
    });

    // Bereits gespeicherte eigene Kategorien erhalten.
    existing.forEach(item => {
      if (!item?.name || storeData.categories.some(cat => cat.name === item.name)) return;
      storeData.categories.push({
        id: item.id || slugifyCategory(item.name),
        name: String(item.name).trim(),
        label: item.label || String(item.name).trim(),
        sort: Number(item.sort) || storeData.categories.length + 1,
        active: item.active !== false,
        system: false
      });
    });

    storeData.categories.sort((a, b) => (a.sort || 999) - (b.sort || 999));
    return storeData.categories;
  }

  function syncCategorySelect(select, selectedValue = "") {
    if (!select) return;
    const categories = ensureCategoryData();
    const current = selectedValue || select.value;

    select.innerHTML = "";
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.label || category.name;
      option.disabled = category.active === false;
      select.appendChild(option);
    });

    if (current && !categories.some(category => category.name === current)) {
      const option = document.createElement("option");
      option.value = current;
      option.textContent = current;
      select.appendChild(option);
    }

    select.value = current || categories.find(category => category.active !== false)?.name || "";
  }

  function syncTemplateCategories() {
    const templateSelect = document.querySelector("#product-template .p-category");
    if (templateSelect) syncCategorySelect(templateSelect, templateSelect.value);
  }

  function syncVisibleProductEditors() {
    document.querySelectorAll(".product-editor-card").forEach(card => {
      const select = card.querySelector(".p-category");
      if (select) syncCategorySelect(select, select.value);
    });
  }

  function productCountFor(name) {
    return (storeData?.products || []).filter(product => product.category === name).length;
  }

  function renderCategories() {
    const box = $cat("#categories-editor");
    if (!box || typeof storeData === "undefined" || !storeData) return;

    const categories = ensureCategoryData();
    box.innerHTML = "";

    categories.forEach(category => {
      const count = productCountFor(category.name);
      const row = document.createElement("article");
      row.className = `category-row${category.active === false ? " is-hidden" : ""}${count ? " is-used" : ""}`;
      row.dataset.categoryId = category.id;
      row.dataset.originalName = category.name;

      row.innerHTML = `
        <label>
          Sortierung
          <input class="cat-sort" type="number" min="1" step="1" value="${Number(category.sort) || 1}">
        </label>

        <label class="category-name-field">
          Interner Kategoriename
          <input class="cat-name" maxlength="80" value="${escapeAdminHtml(category.name)}">
          <small class="category-usage">${count} Produkt${count === 1 ? "" : "e"} zugeordnet</small>
        </label>

        <label class="category-label-field">
          Anzeige im Shop
          <input class="cat-label" maxlength="80" value="${escapeAdminHtml(category.label || category.name)}">
        </label>

        <label>
          Sichtbarkeit
          <select class="cat-active">
            <option value="true"${category.active !== false ? " selected" : ""}>Sichtbar</option>
            <option value="false"${category.active === false ? " selected" : ""}>Ausgeblendet</option>
          </select>
        </label>

        <div class="category-actions">
          <button class="outline-btn cat-apply" type="button">Übernehmen</button>
          <button class="outline-btn danger cat-delete" type="button"${count ? " disabled" : ""}>Löschen</button>
        </div>`;

      row.querySelector(".cat-apply").addEventListener("click", () => applyCategoryRow(row));
      row.querySelector(".cat-delete").addEventListener("click", () => deleteCategory(row));
      box.appendChild(row);
    });
  }

  function escapeAdminHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function applyCategoryRow(row) {
    const categories = ensureCategoryData();
    const category = categories.find(item => item.id === row.dataset.categoryId);
    if (!category) return;

    const oldName = row.dataset.originalName;
    const newName = row.querySelector(".cat-name").value.trim();
    const newLabel = row.querySelector(".cat-label").value.trim() || newName;
    const newSort = Math.max(1, Number(row.querySelector(".cat-sort").value) || 1);
    const active = row.querySelector(".cat-active").value === "true";

    if (!newName) {
      setStatus("#save-status", "Der Kategoriename darf nicht leer sein.", "error");
      return;
    }

    const duplicate = categories.find(item =>
      item !== category && item.name.toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      setStatus("#save-status", "Dieser Kategoriename existiert bereits.", "error");
      return;
    }

    if (oldName !== newName) {
      (storeData.products || []).forEach(product => {
        if (product.category === oldName) product.category = newName;
      });
    }

    category.name = newName;
    category.label = newLabel;
    category.sort = newSort;
    category.active = active;
    category.id = category.id || slugifyCategory(newName);

    row.dataset.originalName = newName;
    storeData.categories.sort((a, b) => (a.sort || 999) - (b.sort || 999));

    syncTemplateCategories();
    if (typeof renderProducts === "function") renderProducts();
    renderCategories();

    setStatus(
      "#save-status",
      "Kategorie übernommen. Für die dauerhafte Speicherung jetzt „Alles veröffentlichen“ anklicken.",
      "success"
    );
  }

  function deleteCategory(row) {
    const categories = ensureCategoryData();
    const category = categories.find(item => item.id === row.dataset.categoryId);
    if (!category) return;

    const count = productCountFor(category.name);
    if (count) {
      setStatus(
        "#save-status",
        `Die Kategorie wird noch von ${count} Produkt${count === 1 ? "" : "en"} verwendet und kann nicht gelöscht werden.`,
        "error"
      );
      return;
    }

    if (!confirm(`Kategorie „${category.label || category.name}“ wirklich löschen?`)) return;

    storeData.categories = categories.filter(item => item !== category);
    syncTemplateCategories();
    syncVisibleProductEditors();
    renderCategories();

    setStatus(
      "#save-status",
      "Kategorie gelöscht. Für die dauerhafte Speicherung jetzt „Alles veröffentlichen“ anklicken.",
      "success"
    );
  }

  function addCategory() {
    const categories = ensureCategoryData();
    let number = 1;
    let name = "Neue Kategorie";
    while (categories.some(category => category.name === name)) {
      number += 1;
      name = `Neue Kategorie ${number}`;
    }

    categories.push({
      id: `${slugifyCategory(name)}-${Date.now()}`,
      name,
      label: name,
      sort: categories.length + 1,
      active: true,
      system: false
    });

    renderCategories();
    syncTemplateCategories();

    const lastRow = document.querySelector("#categories-editor .category-row:last-child");
    lastRow?.querySelector(".cat-name")?.focus();

    setStatus(
      "#save-status",
      "Neue Kategorie angelegt. Namen eintragen, „Übernehmen“ und anschließend „Alles veröffentlichen“ klicken.",
      "success"
    );
  }

  function readCategoriesFromRows() {
    const categories = ensureCategoryData();

    $$cat("#categories-editor .category-row").forEach(row => {
      const category = categories.find(item => item.id === row.dataset.categoryId);
      if (!category) return;

      const oldName = row.dataset.originalName;
      const newName = row.querySelector(".cat-name").value.trim() || oldName;

      if (oldName !== newName && !categories.some(item =>
        item !== category && item.name.toLowerCase() === newName.toLowerCase()
      )) {
        (storeData.products || []).forEach(product => {
          if (product.category === oldName) product.category = newName;
        });
        category.name = newName;
      }

      category.label = row.querySelector(".cat-label").value.trim() || category.name;
      category.sort = Math.max(1, Number(row.querySelector(".cat-sort").value) || 1);
      category.active = row.querySelector(".cat-active").value === "true";
    });

    storeData.categories.sort((a, b) => (a.sort || 999) - (b.sort || 999));
  }

  function installWrappers() {
    if (typeof renderAll === "function") {
      const originalRenderAll = renderAll;
      window.renderAll = function () {
        ensureCategoryData();
        syncTemplateCategories();
        originalRenderAll();
        renderCategories();
      };
    }

    if (typeof createProductEditor === "function") {
      const originalCreateProductEditor = createProductEditor;
      window.createProductEditor = function (product) {
        syncTemplateCategories();
        const fragment = originalCreateProductEditor(product);
        const select = fragment.querySelector?.(".p-category");
        if (select) syncCategorySelect(select, product.category);
        return fragment;
      };
    }

    if (typeof addProduct === "function") {
      const originalAddProduct = addProduct;
      window.addProduct = function () {
        originalAddProduct();
        const product = storeData?.products?.[storeData.products.length - 1];
        const firstActive = ensureCategoryData().find(category => category.active !== false);
        if (product && firstActive && !product.category) product.category = firstActive.name;
      };
    }
  }

  function install() {
    installWrappers();

    $cat("#add-category-btn")?.addEventListener("click", addCategory);

    // Kategorien werden vor dem normalen Veröffentlichungsprozess in storeData übernommen.
    $cat("#save-btn")?.addEventListener("click", () => {
      readCategoriesFromRows();
      syncTemplateCategories();
      syncVisibleProductEditors();
    }, true);

    if (typeof storeData !== "undefined" && storeData) {
      ensureCategoryData();
      syncTemplateCategories();
      renderCategories();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();