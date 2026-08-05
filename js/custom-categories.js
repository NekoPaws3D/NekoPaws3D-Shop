"use strict";

(function () {
  const DEFAULT_CATEGORY_NAMES = new Set([
    "Alle",
    "Sticker",
    "Epoxidharz",
    "3D Druck",
    "Zeichenaufträge",
    "Textildruck",
    "Lasern und Gravuren",
    "Bundles",
    "FSK 18"
  ]);

  function displayLabel(name) {
    if (name === "Lasern und Gravuren") return "Lasern & Gravuren";
    if (name === "Zeichenaufträge") return "Zeichenauftrag";
    return name;
  }

  function hasCategoryControl(container, name) {
    return [...container.querySelectorAll("button,a")].some(element => {
      const onclick = element.getAttribute("onclick") || "";
      return onclick.includes(`'${name}'`) ||
        onclick.includes(`"${name}"`) ||
        element.dataset.category === name;
    });
  }

  function createCategoryButton(category, isNavigation = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.category = category.name;
    button.textContent = category.label || displayLabel(category.name);
    button.addEventListener("click", () => {
      if (typeof filterProducts === "function") {
        filterProducts(category.name);
      }
      if (isNavigation) {
        document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
      }
    });
    return button;
  }

  function normalizedCategories(data) {
    const configured = Array.isArray(data.categories)
      ? data.categories
          .filter(category => category?.name && category.active !== false)
          .map(category => ({
            name: String(category.name).trim(),
            label: String(category.label || category.name).trim(),
            sort: Number(category.sort) || 999
          }))
      : [];

    const productDerived = (data.products || [])
      .map(product => String(product.category || "").trim())
      .filter(Boolean)
      .map((name, index) => ({
        name,
        label: displayLabel(name),
        sort: 1000 + index
      }));

    const merged = new Map();
    [...configured, ...productDerived].forEach(category => {
      if (!merged.has(category.name)) merged.set(category.name, category);
    });

    return [...merged.values()].sort((a, b) => a.sort - b.sort);
  }

  function renderDynamicCategories(data) {
    const categories = normalizedCategories(data);
    const filters = document.querySelector(".filters");
    const navigation = document.querySelector(".nav");

    categories.forEach(category => {
      if (!category.name || DEFAULT_CATEGORY_NAMES.has(category.name)) return;

      if (filters && !hasCategoryControl(filters, category.name)) {
        filters.appendChild(createCategoryButton(category));
      }

      if (navigation && !hasCategoryControl(navigation, category.name)) {
        navigation.appendChild(createCategoryButton(category, true));
      }
    });
  }

  window.addEventListener("neko-store-ready", event => {
    renderDynamicCategories(event.detail || {});
  });

  // Fallback, falls das Ereignis vor dem Laden dieses Skripts ausgelöst wurde.
  if (window.NEKO_STORE_READY) {
    fetch(`data/store.json?categories=${Date.now()}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(renderDynamicCategories)
      .catch(() => {});
  }
})();