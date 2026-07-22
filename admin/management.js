"use strict";
(function () {
  const STATUS = {
    new: "Neu", processing: "In Bearbeitung", production: "Produktion",
    ready: "Versandbereit", shipped: "Verschickt", completed: "Abgeschlossen",
    cancelled: "Storniert"
  };
  const STORAGE_KEY = "nekopaws_management_draft_v1";
  let currentId = null;

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function management() {
    if (!storeData) return { orders: [], invoiceCounter: 1 };
    storeData.management ||= { orders: [], invoiceCounter: 1, version: 1 };
    storeData.management.orders ||= [];
    return storeData.management;
  }

  function nextOrderNumber() {
    const year = new Date().getFullYear();
    const nums = management().orders.map(o => Number(String(o.number || "").match(/(\d+)$/)?.[1]) || 0);
    return `NP-${year}-${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
  }

  function nextInvoiceNumber() {
    const m = management();
    const number = `RE-${new Date().getFullYear()}-${String(m.invoiceCounter || 1).padStart(4, "0")}`;
    m.invoiceCounter = (m.invoiceCounter || 1) + 1;
    return number;
  }

  function setMgmtStatus(message, type="") {
    const el = q("#mgmt-status");
    if (!el) return;
    el.textContent = message;
    el.className = `form-status ${type}`;
  }

  function euro(n) {
    return Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(management()));
    } catch {}
  }

  function restoreDraftIfUseful() {
    if (!storeData) return;
    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (draft?.orders?.length && !storeData.management?.orders?.length) {
        storeData.management = draft;
        setMgmtStatus("Lokaler Management-Entwurf wurde wiederhergestellt. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.", "success");
      }
    } catch {}
  }

  function renderDashboard() {
    const box = q("#mgmt-dashboard");
    if (!box || !storeData) return;
    const orders = management().orders;
    const open = orders.filter(o => !["completed","cancelled"].includes(o.status)).length;
    const production = orders.filter(o => ["processing","production","ready"].includes(o.status)).length;
    const shipped = orders.filter(o => o.status === "shipped").length;
    const revenue = orders.filter(o => o.status !== "cancelled").reduce((s,o) => s + Number(o.total || 0), 0);
    const customers = new Set(orders.map(o => (o.customer?.email || o.customer?.name || "").toLowerCase()).filter(Boolean)).size;
    box.innerHTML = [
      ["Offene Aufträge", open],
      ["In Produktion", production],
      ["Verschickt", shipped],
      ["Kunden", customers],
      ["Auftragswert", euro(revenue)]
    ].map(([label,value]) => `<div class="mgmt-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function filteredOrders() {
    const search = (q("#mgmt-search")?.value || "").toLowerCase().trim();
    const status = q("#mgmt-status-filter")?.value || "";
    return [...management().orders].filter(o => {
      const hay = JSON.stringify(o).toLowerCase();
      return (!search || hay.includes(search)) && (!status || o.status === status);
    }).sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
  }

  function renderOrders() {
    const box = q("#mgmt-orders-list");
    if (!box || !storeData) return;
    const orders = filteredOrders();
    if (!orders.length) {
      box.innerHTML = '<div class="mgmt-empty">Noch keine passenden Bestellungen vorhanden.</div>';
      return;
    }
    box.innerHTML = orders.map(o => `
      <article class="mgmt-order-card" data-order-id="${esc(o.id)}">
        <div class="mgmt-order-top">
          <div><h3>${esc(o.number)} · ${esc(o.customer?.name || "Ohne Namen")}</h3>
          <div class="mgmt-order-meta">
            <span class="mgmt-badge">${esc(STATUS[o.status] || o.status)}</span>
            <span class="mgmt-badge">${esc(o.category || "Sonstiges")}</span>
            <span class="mgmt-badge">Priorität: ${esc(o.priority || "normal")}</span>
            ${o.dueDate ? `<span class="mgmt-badge">Fällig: ${esc(o.dueDate)}</span>` : ""}
          </div></div>
          <strong>${euro(o.total)}</strong>
        </div>
        <div class="mgmt-progress"><span style="width:${Math.min(100,Math.max(0,Number(o.progress||0)))}%"></span></div>
        <small>${Number(o.progress || 0)} % · ${esc((o.items || "").split("\n")[0] || "Keine Artikelangabe")}</small>
        ${o.tracking ? `<p><b>Tracking:</b> ${esc(o.carrier || "")} ${esc(o.tracking)}</p>` : ""}
        <div class="mgmt-actions">
          <button class="outline-btn mgmt-edit" type="button">Bearbeiten</button>
          <button class="outline-btn mgmt-print" type="button">Rechnung drucken/PDF</button>
          <button class="outline-btn mgmt-duplicate" type="button">Duplizieren</button>
        </div>
      </article>`).join("");
    qa(".mgmt-edit").forEach(btn => btn.onclick = () => openOrder(btn.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-print").forEach(btn => btn.onclick = () => printInvoice(btn.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-duplicate").forEach(btn => btn.onclick = () => duplicateOrder(btn.closest("[data-order-id]").dataset.orderId));
  }

  function renderKanban() {
    const box = q("#mgmt-kanban");
    if (!box || !storeData) return;
    const columns = ["new","processing","production","ready","shipped"];
    box.innerHTML = columns.map(status => `
      <section class="mgmt-column">
        <h3>${STATUS[status]}</h3>
        ${management().orders.filter(o => o.status === status).map(o => `
          <article class="mgmt-ticket" data-order-id="${esc(o.id)}">
            <b>${esc(o.number)}</b><br>
            ${esc(o.customer?.name || "")}<br>
            <small>${esc(o.category || "")} · ${Number(o.progress || 0)} %</small>
          </article>`).join("") || '<small class="muted">Leer</small>'}
      </section>`).join("");
    qa(".mgmt-ticket").forEach(el => el.onclick = () => openOrder(el.dataset.orderId));
  }

  function customerGroups() {
    const map = new Map();
    for (const o of management().orders) {
      const key = (o.customer?.email || o.customer?.name || "unbekannt").toLowerCase();
      if (!map.has(key)) map.set(key, { customer: o.customer || {}, orders: [], total: 0 });
      const group = map.get(key);
      group.orders.push(o);
      if (o.status !== "cancelled") group.total += Number(o.total || 0);
    }
    return [...map.values()].sort((a,b) => b.total - a.total);
  }

  function renderCustomers() {
    const box = q("#mgmt-customers-list");
    if (!box || !storeData) return;
    const groups = customerGroups();
    box.innerHTML = groups.length ? groups.map(g => `
      <article class="mgmt-customer-card">
        <h3>${esc(g.customer.name || "Unbekannt")}</h3>
        <p>${esc(g.customer.email || "")}${g.customer.phone ? ` · ${esc(g.customer.phone)}` : ""}</p>
        <p><b>${g.orders.length}</b> Bestellung(en) · Gesamtwert <b>${euro(g.total)}</b></p>
        <small>${g.orders.map(o => esc(o.number)).join(", ")}</small>
      </article>`).join("") : '<div class="mgmt-empty">Noch keine Kundendaten vorhanden.</div>';
  }

  function renderInvoices() {
    const box = q("#mgmt-invoices-list");
    if (!box || !storeData) return;
    const orders = management().orders.filter(o => o.invoiceNumber || o.status !== "cancelled");
    box.innerHTML = orders.length ? orders.map(o => `
      <article class="mgmt-invoice-card" data-order-id="${esc(o.id)}">
        <div class="section-row">
          <div><h3>${esc(o.invoiceNumber || "Noch keine Rechnungsnummer")}</h3><p>${esc(o.number)} · ${esc(o.customer?.name || "")}</p></div>
          <strong>${euro(o.total)}</strong>
        </div>
        <div class="mgmt-actions">
          <button class="outline-btn mgmt-create-invoice" type="button">${o.invoiceNumber ? "Rechnung öffnen" : "Rechnungsnummer erzeugen"}</button>
        </div>
      </article>`).join("") : '<div class="mgmt-empty">Noch keine Rechnungen vorhanden.</div>';
    qa(".mgmt-create-invoice").forEach(btn => btn.onclick = () => {
      const id = btn.closest("[data-order-id]").dataset.orderId;
      const order = management().orders.find(o => String(o.id) === String(id));
      if (!order.invoiceNumber) {
        order.invoiceNumber = nextInvoiceNumber();
        saveDraft(); renderAllManagement();
      }
      printInvoice(id);
    });
  }

  function renderAllManagement() {
    renderDashboard(); renderOrders(); renderKanban(); renderCustomers(); renderInvoices();
  }

  function openOrder(id=null) {
    const modal = q("#mgmt-order-modal");
    if (!modal) return;
    currentId = id;
    const order = id ? management().orders.find(o => String(o.id) === String(id)) : null;
    q("#mgmt-order-id").value = order?.id || "";
    q("#mgmt-order-number").value = order?.number || nextOrderNumber();
    q("#mgmt-order-date").value = order?.date || new Date().toISOString().slice(0,10);
    q("#mgmt-order-status").value = order?.status || "new";
    q("#mgmt-order-priority").value = order?.priority || "normal";
    q("#mgmt-order-category").value = order?.category || "3D-Druck";
    q("#mgmt-order-progress").value = Number(order?.progress || 0);
    q("#mgmt-order-due").value = order?.dueDate || "";
    q("#mgmt-order-total").value = Number(order?.total || 0);
    q("#mgmt-customer-name").value = order?.customer?.name || "";
    q("#mgmt-customer-email").value = order?.customer?.email || "";
    q("#mgmt-customer-phone").value = order?.customer?.phone || "";
    q("#mgmt-customer-address").value = order?.customer?.address || "";
    q("#mgmt-order-items").value = order?.items || "";
    q("#mgmt-order-carrier").value = order?.carrier || "";
    q("#mgmt-order-tracking").value = order?.tracking || "";
    q("#mgmt-order-shipped-date").value = order?.shippedDate || "";
    q("#mgmt-order-invoice").value = order?.invoiceNumber || "";
    q("#mgmt-order-notes").value = order?.notes || "";
    q("#mgmt-delete-order").classList.toggle("hidden", !order);
    modal.classList.remove("hidden");
    document.body.classList.add("mgmt-modal-open");
  }

  function closeOrder() {
    q("#mgmt-order-modal")?.classList.add("hidden");
    document.body.classList.remove("mgmt-modal-open");
    currentId = null;
  }

  function saveOrder(event) {
    event.preventDefault();
    const existing = currentId ? management().orders.find(o => String(o.id) === String(currentId)) : null;
    const order = existing || { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` };
    Object.assign(order, {
      number: q("#mgmt-order-number").value.trim(),
      date: q("#mgmt-order-date").value,
      status: q("#mgmt-order-status").value,
      priority: q("#mgmt-order-priority").value,
      category: q("#mgmt-order-category").value,
      progress: Number(q("#mgmt-order-progress").value || 0),
      dueDate: q("#mgmt-order-due").value,
      total: Number(q("#mgmt-order-total").value || 0),
      customer: {
        name: q("#mgmt-customer-name").value.trim(),
        email: q("#mgmt-customer-email").value.trim(),
        phone: q("#mgmt-customer-phone").value.trim(),
        address: q("#mgmt-customer-address").value.trim()
      },
      items: q("#mgmt-order-items").value.trim(),
      carrier: q("#mgmt-order-carrier").value,
      tracking: q("#mgmt-order-tracking").value.trim(),
      shippedDate: q("#mgmt-order-shipped-date").value,
      invoiceNumber: q("#mgmt-order-invoice").value.trim(),
      notes: q("#mgmt-order-notes").value.trim(),
      updatedAt: new Date().toISOString()
    });
    if (!existing) management().orders.unshift(order);
    saveDraft(); closeOrder(); renderAllManagement();
    setMgmtStatus("Bestellung gespeichert. Für die dauerhafte Speicherung jetzt „Alles veröffentlichen“ anklicken.", "success");
  }

  function deleteOrder() {
    if (!currentId || !confirm("Diese Bestellung wirklich löschen?")) return;
    management().orders = management().orders.filter(o => String(o.id) !== String(currentId));
    saveDraft(); closeOrder(); renderAllManagement();
  }

  function duplicateOrder(id) {
    const source = management().orders.find(o => String(o.id) === String(id));
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    copy.number = nextOrderNumber();
    copy.status = "new";
    copy.progress = 0;
    copy.invoiceNumber = "";
    copy.tracking = "";
    copy.shippedDate = "";
    copy.date = new Date().toISOString().slice(0,10);
    management().orders.unshift(copy);
    saveDraft(); renderAllManagement();
  }

  function printInvoice(id) {
    const order = management().orders.find(o => String(o.id) === String(id));
    if (!order) return;
    if (!order.invoiceNumber) {
      order.invoiceNumber = nextInvoiceNumber();
      saveDraft();
    }
    const old = q("#mgmt-invoice-print");
    old?.remove();
    const printable = document.createElement("section");
    printable.id = "mgmt-invoice-print";
    printable.className = "invoice-print";
    printable.innerHTML = `
      <h1>Rechnung ${esc(order.invoiceNumber)}</h1>
      <p><b>NekoPaws3D</b><br>Annika Morr<br>Georg-Büchner-Str. 23<br>Ludwigshafen<br>neko.paws3d@gmail.com</p>
      <hr>
      <p><b>Rechnung an:</b><br>${esc(order.customer?.name || "")}<br>${esc(order.customer?.address || "").replace(/\n/g,"<br>")}<br>${esc(order.customer?.email || "")}</p>
      <p><b>Rechnungsdatum:</b> ${new Date().toLocaleDateString("de-DE")}<br><b>Bestellnummer:</b> ${esc(order.number)}</p>
      <h2>Leistungen / Artikel</h2>
      <div style="white-space:pre-wrap">${esc(order.items || "Individueller Auftrag")}</div>
      <hr>
      <h2>Gesamtbetrag: ${euro(order.total)}</h2>
      <p>Zahlung auf Rechnung. Bitte die auf der übermittelten Rechnung genannte Zahlungsfrist beachten.</p>
      <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.</p>
      <p>Vielen Dank für deinen Auftrag!</p>`;
    document.body.appendChild(printable);
    renderInvoices();
    setTimeout(() => window.print(), 50);
  }

  function exportManagement() {
    const blob = new Blob([JSON.stringify(management(), null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `NekoPaws3D-Management-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importManagement(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.orders)) throw new Error("Ungültiges Backupformat");
      if (!confirm(`${data.orders.length} Bestellung(en) importieren und vorhandene Managementdaten ersetzen?`)) return;
      storeData.management = data;
      saveDraft(); renderAllManagement();
      setMgmtStatus("Backup importiert. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.", "success");
    } catch (e) {
      setMgmtStatus(`Import fehlgeschlagen: ${e.message}`, "error");
    } finally {
      event.target.value = "";
    }
  }

  function install() {
    const originalRenderAll = window.renderAll;
    if (typeof originalRenderAll === "function") {
      window.renderAll = function () {
        originalRenderAll();
        restoreDraftIfUseful();
        renderAllManagement();
      };
    }

    const originalSaveAll = window.saveAll;
    if (typeof originalSaveAll === "function") {
      window.saveAll = async function () {
        saveDraft();
        await originalSaveAll();
      };
    }

    q("#mgmt-add-order-btn")?.addEventListener("click", () => openOrder());
    q("#mgmt-close-modal")?.addEventListener("click", closeOrder);
    q("#mgmt-order-form")?.addEventListener("submit", saveOrder);
    q("#mgmt-delete-order")?.addEventListener("click", deleteOrder);
    q("#mgmt-search")?.addEventListener("input", renderOrders);
    q("#mgmt-status-filter")?.addEventListener("change", renderOrders);
    q("#mgmt-export-btn")?.addEventListener("click", exportManagement);
    q("#mgmt-import-input")?.addEventListener("change", importManagement);
    q("#mgmt-order-modal")?.addEventListener("click", e => { if (e.target.id === "mgmt-order-modal") closeOrder(); });

    qa("[data-mgmt-view]").forEach(btn => btn.addEventListener("click", () => {
      qa("[data-mgmt-view]").forEach(b => b.classList.toggle("active", b === btn));
      qa(".mgmt-view").forEach(v => v.classList.add("hidden"));
      q(`#mgmt-view-${btn.dataset.mgmtView}`)?.classList.remove("hidden");
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
})();
