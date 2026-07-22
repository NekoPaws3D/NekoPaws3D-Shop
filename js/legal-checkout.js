"use strict";
(function () {
  const availabilityLabels = {
    stock: "Lagerware / sofort versandbereit",
    made_to_order: "Wird nach Bestellung gefertigt",
    individual: "Individuelle Anfertigung / nach Absprache",
    digital: "Digitale Leistung / kein Versand"
  };

  function deliveryHtml(product) {
    if (!product) return "";
    const rows = [];
    if (product.availabilityType) rows.push(`<span><b>Verfügbarkeit:</b> ${escapeHtml(availabilityLabels[product.availabilityType] || product.availabilityType)}</span>`);
    if (product.productionTime) rows.push(`<span><b>Fertigungszeit:</b> ${escapeHtml(product.productionTime)}</span>`);
    if (product.shippingTime && product.availabilityType !== "digital") rows.push(`<span><b>Versandlaufzeit:</b> ${escapeHtml(product.shippingTime)}</span>`);
    if (product.deliveryNote) rows.push(`<span>${escapeHtml(product.deliveryNote)}</span>`);
    if (!rows.length) return "";
    return `<div class="product-delivery-info">${rows.join("")}</div>`;
  }

  function decorateProducts() {
    if (typeof getProduct !== "function") return;
    document.querySelectorAll(".product-card,[data-product-id]").forEach(card => {
      if (card.querySelector(".product-delivery-info")) return;
      let id = card.dataset.productId || card.dataset.id;
      if (!id) {
        const click = card.querySelector("[onclick*='addToCart'],[onclick*='openProductInquiry']")?.getAttribute("onclick") || "";
        id = (click.match(/\((\d+)/) || [])[1];
      }
      const product = getProduct(id);
      if (!product) return;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = deliveryHtml(product);
      const info = wrapper.firstElementChild;
      if (!info) return;
      const actions = card.querySelector(".product-actions,button[onclick*='addToCart'],button[onclick*='openProductInquiry']");
      if (actions?.parentNode) actions.parentNode.insertBefore(info, actions);
      else card.appendChild(info);
    });
  }

  function deliveryText(product) {
    if (!product) return "";
    const parts = [];
    if (product.availabilityType) parts.push(`Verfügbarkeit: ${availabilityLabels[product.availabilityType] || product.availabilityType}`);
    if (product.productionTime) parts.push(`Fertigungszeit: ${product.productionTime}`);
    if (product.shippingTime && product.availabilityType !== "digital") parts.push(`Versandlaufzeit: ${product.shippingTime}`);
    if (product.deliveryNote) parts.push(product.deliveryNote);
    return parts.join(" | ");
  }

  function installCartAndOrder() {
    if (typeof renderCart === "function") {
      const originalRenderCart = renderCart;
      window.renderCart = function () {
        originalRenderCart();
        document.querySelectorAll(".cart-item").forEach((itemEl, index) => {
          if (itemEl.querySelector(".cart-delivery-info")) return;
          const cartItem = cart?.[index];
          const product = cartItem && getProduct(cartItem.id);
          const text = deliveryText(product);
          if (!text) return;
          const small = document.createElement("small");
          small.className = "cart-delivery-info";
          small.textContent = text;
          itemEl.querySelector(".cart-row-actions")?.before(small);
        });
      };
    }

    if (typeof buildOrderText === "function") {
      const originalBuildOrderText = buildOrderText;
      window.buildOrderText = function () {
        const original = originalBuildOrderText();
        const deliveryLines = (cart || []).map(item => {
          const product = getProduct(item.id);
          const times = deliveryText(product);
          return times ? `${product.name}: ${times}` : "";
        }).filter(Boolean);
        return [
          original,
          "",
          "ZAHLUNGSART: Kauf auf Rechnung",
          "Hinweis: Umsatzsteuer wird aufgrund der Kleinunternehmerregelung gemäß § 19 UStG nicht ausgewiesen.",
          ...(deliveryLines.length ? ["", "FERTIGUNGS- UND LIEFERZEITEN:", ...deliveryLines] : [])
        ].join("\n");
      };
    }

    if (typeof ensureOrderModal === "function") {
      const originalEnsure = ensureOrderModal;
      window.ensureOrderModal = function () {
        originalEnsure();
        const form = document.getElementById("order-form");
        if (!form || form.dataset.legalInstalled) return;
        form.dataset.legalInstalled = "true";

        const consent = form.querySelector(".consent-check");
        if (consent) {
          consent.innerHTML = `
            <input type="checkbox" required>
            Ich habe die <a href="agb.html" target="_blank" rel="noopener">AGB</a>,
            die <a href="widerruf.html" target="_blank" rel="noopener">Widerrufsbelehrung</a>
            und die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a>
            gelesen und stimme ihrer Geltung für meine Bestellanfrage zu.`;
        }

        const overview = form.querySelector("#order-preview");
        if (overview && !form.querySelector(".legal-order-note")) {
          const note = document.createElement("div");
          note.className = "legal-order-note";
          note.innerHTML = `
            <p><b>Zahlung:</b> Kauf auf Rechnung. Die Rechnung und Zahlungsfrist werden mit der Annahme der Bestellung mitgeteilt.</p>
            <p><b>Vertragsschluss:</b> Das Absenden stellt eine verbindliche Bestellanfrage dar. Der Vertrag kommt erst durch ausdrückliche Annahme oder Rechnungsübersendung durch NekoPaws3D zustande.</p>
            <p><b>Preise:</b> Aufgrund der Kleinunternehmerregelung gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.</p>
            <p><b>Zeiten:</b> Fertigungszeit und Versandlaufzeit sind produktabhängig und werden beim jeweiligen Artikel sowie in dieser Bestellübersicht angegeben.</p>`;
          overview.after(note);
        }

        const button = document.getElementById("order-submit-btn");
        if (button) button.textContent = "Zahlungspflichtige Bestellanfrage senden";
      };
    }
  }

  function run() {
    decorateProducts();
    installCartAndOrder();
  }

  window.addEventListener("neko-store-ready", () => {
    setTimeout(decorateProducts, 100);
    setTimeout(decorateProducts, 700);
  });
  document.addEventListener("DOMContentLoaded", () => {
    installCartAndOrder();
    setTimeout(decorateProducts, 700);
    setTimeout(decorateProducts, 1600);
  });
})();
