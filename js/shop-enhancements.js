"use strict";
(function () {
  function safeDecorate() {
    if (typeof getProduct !== "function") return;
    document.querySelectorAll(".product-card,[data-product-id]").forEach(card => {
      let id = card.dataset.productId || card.dataset.id;
      if (!id) {
        const onclick = card.querySelector("[onclick*='addToCart']")?.getAttribute("onclick") || "";
        id = (onclick.match(/addToCart\((\d+)/) || [])[1];
      }
      const product = getProduct(id);
      if (!product || product.showStockWarning === false) return;

      const stock = Number(product.stock) || 0;
      const threshold = Number(product.lowStockThreshold) || 3;
      const type = stock <= 0 ? "soldout" : stock <= threshold ? "low" : "ok";
      const text = stock <= 0 ? "Ausverkauft" : stock <= threshold
        ? `Nur noch ${stock} Stück verfügbar`
        : `${stock} Stück verfügbar`;

      let badge = card.querySelector(".stock-status-badge");
      if (!badge) {
        badge = document.createElement("div");
        card.appendChild(badge);
      }

      const wantedClass = `stock-status-badge ${type}`;
      if (badge.className !== wantedClass) badge.className = wantedClass;
      if (badge.textContent !== text) badge.textContent = text;

      if (type === "soldout") {
        card.querySelectorAll("[onclick*='addToCart']").forEach(button => {
          button.disabled = true;
          button.textContent = "Ausverkauft";
          button.removeAttribute("onclick");
        });
      }
    });
  }

  // Wichtig: Kein MutationObserver. Der alte Observer reagierte auf seine
  // eigenen DOM-Änderungen und verursachte eine Endlosschleife.
  window.addEventListener("neko-store-ready", () => {
    setTimeout(safeDecorate, 0);
    setTimeout(safeDecorate, 500);
  });

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(safeDecorate, 500);
    setTimeout(safeDecorate, 1500);
  });
})();