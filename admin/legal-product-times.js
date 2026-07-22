"use strict";
(function () {
  const $$local = selector => [...document.querySelectorAll(selector)];

  function install() {
    if (typeof createProductEditor === "function") {
      const originalCreate = createProductEditor;
      window.createProductEditor = function (product) {
        const fragment = originalCreate(product);
        const set = (selector, value) => {
          const el = fragment.querySelector?.(selector);
          if (el) el.value = value ?? "";
        };
        set(".p-availability-type", product.availabilityType || (Number(product.stock) > 0 ? "stock" : "made_to_order"));
        set(".p-production-time", product.productionTime || "");
        set(".p-shipping-time", product.shippingTime || "");
        set(".p-delivery-note", product.deliveryNote || "");
        return fragment;
      };
    }

    if (typeof readEditors === "function") {
      const originalRead = readEditors;
      window.readEditors = function () {
        originalRead();
        $$local(".product-editor-card").forEach(card => {
          const product = storeData?.products?.find(p => String(p.id) === String(card.dataset.id));
          if (!product) return;
          product.availabilityType = card.querySelector(".p-availability-type")?.value || "stock";
          product.productionTime = card.querySelector(".p-production-time")?.value.trim() || "";
          product.shippingTime = card.querySelector(".p-shipping-time")?.value.trim() || "";
          product.deliveryNote = card.querySelector(".p-delivery-note")?.value.trim() || "";
        });
      };
    }

    if (typeof addProduct === "function") {
      const originalAdd = addProduct;
      window.addProduct = function () {
        originalAdd();
        const product = storeData?.products?.[storeData.products.length - 1];
        if (product) {
          product.availabilityType = "made_to_order";
          product.productionTime = "";
          product.shippingTime = "";
          product.deliveryNote = "";
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
