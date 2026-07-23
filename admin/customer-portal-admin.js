"use strict";
(() => {
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const euro = n => Number(n || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const todayIso = () => new Date().toISOString();

  function mgmt() {
    if (typeof storeData === "undefined" || !storeData) return null;
    storeData.management ||= {};
    storeData.management.orders ||= [];
    storeData.management.customers ||= [];
    storeData.management.customerPortals ||= [];
    migrateCustomers();
    return storeData.management;
  }

  function migrateCustomers() {
    const m = storeData?.management;
    if (!m) return;
    m.customers ||= [];
    const emails = new Set(m.customers.map(c => normalizeEmail(c.email)).filter(Boolean));
    for (const o of m.orders || []) {
      const email = normalizeEmail(o.customer?.email);
      if (!email || emails.has(email)) continue;
      const customer = {
        id: uuid(),
        number: nextCustomerNumber(m.customers),
        active: true,
        name: o.customer?.name || "",
        email: o.customer?.email || "",
        phone: o.customer?.phone || "",
        billingAddress: o.customer?.address || "",
        shippingAddress: o.customer?.address || "",
        notes: "",
        createdAt: o.createdAt || todayIso(),
        updatedAt: todayIso()
      };
      m.customers.push(customer);
      emails.add(email);
      o.customerId ||= customer.id;
    }
    for (const o of m.orders || []) {
      if (o.customerId) continue;
      const email = normalizeEmail(o.customer?.email);
      const match = m.customers.find(c => normalizeEmail(c.email) === email);
      if (match) o.customerId = match.id;
    }
  }

  function nextCustomerNumber(customers = mgmt()?.customers || []) {
    const year = new Date().getFullYear();
    const max = Math.max(0, ...customers.map(c => Number(String(c.number || "").match(/(\d+)$/)?.[1]) || 0));
    return `KD-${year}-${String(max + 1).padStart(4,"0")}`;
  }

  function portalHashSet() {
    return new Set((mgmt()?.customerPortals || []).map(p => p.emailHash));
  }

  function saveManagementDraft() {
    const m = mgmt();
    if (!m) return;
    try {
      localStorage.setItem("nekopaws_management_draft_v1", JSON.stringify(m));
    } catch (error) {
      console.warn("Management-Entwurf konnte nicht lokal gespeichert werden:", error);
    }
  }

  const bytesToB64 = bytes => btoa(String.fromCharCode(...bytes));
  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return bytesToB64(new Uint8Array(await crypto.subtle.digest("SHA-256",data)));
  }
  async function deriveKey(code,salt) {
    const material = await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey(
      {name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},
      material,{name:"AES-GCM",length:256},false,["encrypt"]
    );
  }

  function customerOrders(customer) {
    const email = normalizeEmail(customer.email);
    return (mgmt()?.orders || []).filter(o =>
      String(o.customerId || "") === String(customer.id) ||
      (!o.customerId && normalizeEmail(o.customer?.email) === email)
    );
  }

  function totalFor(customer) {
    return customerOrders(customer)
      .filter(o => o.status !== "cancelled" && o.payment?.status !== "cancelled")
      .reduce((sum,o) => sum + Number(o.total || 0), 0);
  }

  function lastOrder(customer) {
    return [...customerOrders(customer)].sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
  }

  async function portalState(customer) {
    if (!customer.email) return "none";
    const hash = await sha256(normalizeEmail(customer.email));
    const entry = (mgmt()?.customerPortals || []).find(p => p.emailHash === hash);
    if (!entry) return "none";
    return customer.active === false ? "inactive" : "active";
  }

  async function render() {
    const m = mgmt();
    const box = q("#cp-customer-list");
    if (!m || !box) return;

    const search = (q("#cp-search")?.value || "").toLowerCase().trim();
    const filter = q("#cp-status-filter")?.value || "";
    const rows = await Promise.all(m.customers.map(async customer => ({
      customer,
      state: await portalState(customer),
      orders: customerOrders(customer),
      total: totalFor(customer),
      last: lastOrder(customer)
    })));

    const filtered = rows.filter(row => {
      const hay = `${row.customer.number} ${row.customer.name} ${row.customer.email}`.toLowerCase();
      return (!search || hay.includes(search)) && (!filter || row.state === filter);
    });

    const activeCount = rows.filter(r => r.state === "active").length;
    const withoutPortal = rows.filter(r => r.state === "none").length;
    const totalOrders = rows.reduce((s,r) => s + r.orders.length, 0);
    q("#cp-summary").innerHTML = [
      ["Kunden",rows.length],["Aktive Portale",activeCount],
      ["Ohne Zugang",withoutPortal],["Verknüpfte Bestellungen",totalOrders]
    ].map(([l,v]) => `<div class="mgmt-stat"><span>${l}</span><strong>${v}</strong></div>`).join("");

    box.innerHTML = filtered.length ? filtered.map(({customer,state,orders,total,last}) => `
      <article class="mgmt-customer-card cp-card" data-customer-id="${esc(customer.id)}">
        <div class="section-row">
          <div>
            <h3>${esc(customer.number)} · ${esc(customer.name || "Ohne Namen")}</h3>
            <p>${esc(customer.email || "Keine E-Mail")}${customer.phone ? ` · ${esc(customer.phone)}` : ""}</p>
          </div>
          <span class="mgmt-badge ${state === "active" ? "payment-paid" : state === "inactive" ? "payment-cancelled" : "payment-open"}">
            ${state === "active" ? "Portal aktiv" : state === "inactive" ? "Portal gesperrt" : "Noch kein Zugang"}
          </span>
        </div>
        <div class="cp-customer-metrics">
          <span><b>${orders.length}</b> Bestellung(en)</span>
          <span>Umsatz <b>${euro(total)}</b></span>
          <span>Letzte Bestellung <b>${last?.date ? new Date(`${last.date}T12:00:00`).toLocaleDateString("de-DE") : "–"}</b></span>
        </div>
        ${customer.notes ? `<p class="muted">${esc(customer.notes)}</p>` : ""}
        <div class="mgmt-actions">
          <button class="outline-btn cp-edit" type="button">Bearbeiten</button>
          <button class="outline-btn cp-access" type="button">${state === "none" ? "Zugang erstellen" : "Portal synchronisieren"}</button>
          ${state !== "none" ? `<button class="outline-btn cp-toggle" type="button">${customer.active === false ? "Portal freigeben" : "Portal sperren"}</button>` : ""}
          <button class="outline-btn cp-preview" type="button">Portalvorschau</button>
        </div>
      </article>`).join("") : '<div class="mgmt-empty">Keine passenden Kunden vorhanden.</div>';

    qa(".cp-edit").forEach(btn => btn.onclick = () => openCustomer(btn.closest("[data-customer-id]").dataset.customerId));
    qa(".cp-access").forEach(btn => btn.onclick = () => createOrSyncPortal(btn.closest("[data-customer-id]").dataset.customerId));
    qa(".cp-toggle").forEach(btn => btn.onclick = () => toggleCustomer(btn.closest("[data-customer-id]").dataset.customerId));
    qa(".cp-preview").forEach(btn => btn.onclick = () => previewCustomer(btn.closest("[data-customer-id]").dataset.customerId));
    populateOrderCustomerSelect();
  }

  function openCustomer(id = "") {
    const customer = id ? mgmt().customers.find(c => String(c.id) === String(id)) : null;
    q("#cp-modal-title").textContent = customer ? "Kunde bearbeiten" : "Kunde anlegen";
    q("#cp-customer-id").value = customer?.id || "";
    q("#cp-number").value = customer?.number || nextCustomerNumber();
    q("#cp-active").value = String(customer?.active !== false);
    q("#cp-name").value = customer?.name || "";
    q("#cp-email").value = customer?.email || "";
    q("#cp-phone").value = customer?.phone || "";
    q("#cp-billing-address").value = customer?.billingAddress || "";
    q("#cp-shipping-address").value = customer?.shippingAddress || "";
    q("#cp-notes").value = customer?.notes || "";
    q("#cp-delete-customer").classList.toggle("hidden",!customer);
    q("#cp-customer-modal").classList.remove("hidden");
    document.body.classList.add("mgmt-modal-open");
  }

  function closeCustomer() {
    q("#cp-customer-modal").classList.add("hidden");
    document.body.classList.remove("mgmt-modal-open");
  }

  function saveCustomer(event) {
    event.preventDefault();
    const id = q("#cp-customer-id").value;
    const existing = id ? mgmt().customers.find(c => String(c.id) === String(id)) : null;
    const email = q("#cp-email").value.trim();
    const duplicate = mgmt().customers.find(c => normalizeEmail(c.email) === normalizeEmail(email) && String(c.id) !== String(id));
    if (duplicate) {
      alert("Für diese E-Mail-Adresse existiert bereits ein Kunde.");
      return;
    }
    const customer = existing || {id:uuid(),createdAt:todayIso()};
    Object.assign(customer,{
      number:q("#cp-number").value || nextCustomerNumber(),
      active:q("#cp-active").value === "true",
      name:q("#cp-name").value.trim(),
      email,
      phone:q("#cp-phone").value.trim(),
      billingAddress:q("#cp-billing-address").value.trim(),
      shippingAddress:q("#cp-shipping-address").value.trim(),
      notes:q("#cp-notes").value.trim(),
      updatedAt:todayIso()
    });
    if (!existing) mgmt().customers.unshift(customer);
    saveManagementDraft();
    closeCustomer();
    render();
    setStatus("Kunde gespeichert. Für die dauerhafte Speicherung „Alles veröffentlichen“ anklicken.","success");
  }

  async function deleteCustomer() {
    const id = q("#cp-customer-id").value;
    const customer = mgmt().customers.find(c => String(c.id) === String(id));
    if (!customer || !confirm("Diesen Kunden wirklich löschen? Bestehende Bestellungen bleiben erhalten.")) return;
    if (customer.email) {
      const hash = await sha256(normalizeEmail(customer.email));
      mgmt().customerPortals = mgmt().customerPortals.filter(p => p.emailHash !== hash);
    }
    mgmt().customers = mgmt().customers.filter(c => String(c.id) !== String(id));
    mgmt().orders.forEach(o => { if (String(o.customerId || "") === String(id)) delete o.customerId; });
    saveManagementDraft();
    closeCustomer();
    render();
    setStatus("Kunde und Portalzugang gelöscht. Bestellungen wurden nicht gelöscht.","success");
  }

  function payload(customer) {
    return {
      version:2,
      updatedAt:todayIso(),
      customer:{
        id:customer.id, number:customer.number, name:customer.name, email:customer.email,
        phone:customer.phone, address:customer.billingAddress,
        billingAddress:customer.billingAddress, shippingAddress:customer.shippingAddress
      },
      orders:customerOrders(customer).map(o => ({
        id:o.id,number:o.number,date:o.date,status:o.status,category:o.category,
        progress:Number(o.progress||0),dueDate:o.dueDate,total:Number(o.total||0),
        items:o.items||"",carrier:o.carrier||"",tracking:o.tracking||"",
        shippedDate:o.shippedDate||"",invoiceNumber:o.invoiceNumber||"",
        payment:{
          invoiceDate:o.payment?.invoiceDate||"",days:Number(o.payment?.days??14),
          dueDate:o.payment?.dueDate||"",status:o.payment?.status||"open",
          paidDate:o.payment?.paidDate||"",smallBusiness:o.payment?.smallBusiness!==false
        }
      }))
    };
  }

  async function createOrSyncPortal(id) {
    const customer = mgmt().customers.find(c => String(c.id) === String(id));
    if (!customer?.email) return setStatus("Für den Kunden ist keine E-Mail-Adresse hinterlegt.","error");
    if (!window.crypto?.subtle) return setStatus("Dieser Browser unterstützt die sichere Verschlüsselung nicht.","error");

    const code = prompt("Persönlichen Zugangscode eingeben (mindestens 8 Zeichen):");
    if (code === null) return;
    if (code.length < 8) return setStatus("Der Zugangscode muss mindestens 8 Zeichen lang sein.","error");
    const repeat = prompt("Zugangscode erneut eingeben:");
    if (repeat !== code) return setStatus("Die Zugangscodes stimmen nicht überein.","error");

    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(code,salt);
      const plain = new TextEncoder().encode(JSON.stringify(payload(customer)));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain));
      const emailHash = await sha256(normalizeEmail(customer.email));
      const entry = {emailHash,salt:bytesToB64(salt),iv:bytesToB64(iv),cipher:bytesToB64(encrypted),updatedAt:todayIso(),active:customer.active !== false};
      const index = mgmt().customerPortals.findIndex(p => p.emailHash === emailHash);
      if (index >= 0) mgmt().customerPortals[index] = entry;
      else mgmt().customerPortals.push(entry);
      saveManagementDraft();
      render();
      setStatus(`Portal für ${customer.name} synchronisiert. Zugangscode sicher mitteilen und „Alles veröffentlichen“ anklicken.`,"success");
    } catch (error) {
      setStatus(`Portal konnte nicht erstellt werden: ${error.message}`,"error");
    }
  }

  async function toggleCustomer(id) {
    const customer = mgmt().customers.find(c => String(c.id) === String(id));
    if (!customer) return;
    customer.active = customer.active === false;
    customer.updatedAt = todayIso();
    if (customer.email) {
      const hash = await sha256(normalizeEmail(customer.email));
      const portal = mgmt().customerPortals.find(p => p.emailHash === hash);
      if (portal) portal.active = customer.active;
    }
    saveManagementDraft();
    render();
    setStatus(customer.active ? "Portal freigegeben." : "Portal gesperrt.","success");
  }

  function previewCustomer(id) {
    const customer = mgmt().customers.find(c => String(c.id) === String(id));
    if (!customer) return;
    const orders = customerOrders(customer);
    const win = window.open("","_blank","noopener");
    if (!win) return setStatus("Die Vorschau wurde vom Browser blockiert.","error");
    win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Portalvorschau</title>
      <style>body{font-family:Arial;background:#111321;color:#fff;padding:30px}article{border:1px solid #555;border-radius:14px;padding:15px;margin:12px 0}.badge{display:inline-block;border:1px solid #888;border-radius:99px;padding:4px 8px}</style></head>
      <body><h1>Hallo ${esc(customer.name)} ♡</h1><p>${esc(customer.number)} · ${esc(customer.email)}</p>
      <h2>Bestellungen (${orders.length})</h2>${orders.map(o => `<article><b>${esc(o.number)}</b> · ${euro(o.total)}<p class="badge">${esc(o.status)}</p><p>${esc(o.items||"").replace(/\n/g,"<br>")}</p></article>`).join("") || "<p>Keine Bestellungen zugeordnet.</p>"}
      </body></html>`);
    win.document.close();
  }

  function populateOrderCustomerSelect() {
    const select = q("#cp-order-customer");
    if (!select || !mgmt()) return;
    const current = q("#cp-order-customer-id")?.value || "";
    select.innerHTML = '<option value="">Keine Verknüpfung / Daten manuell eingeben</option>' +
      [...mgmt().customers].sort((a,b) => String(a.name).localeCompare(String(b.name),"de"))
      .map(c => `<option value="${esc(c.id)}">${esc(c.number)} · ${esc(c.name)} · ${esc(c.email)}</option>`).join("");
    select.value = current;
  }

  function fillOrderCustomer(id) {
    q("#cp-order-customer-id").value = id || "";
    const customer = mgmt().customers.find(c => String(c.id) === String(id));
    if (!customer) return;
    q("#mgmt-customer-name").value = customer.name || "";
    q("#mgmt-customer-email").value = customer.email || "";
    q("#mgmt-customer-phone").value = customer.phone || "";
    q("#mgmt-customer-address").value = customer.shippingAddress || customer.billingAddress || "";
  }

  function setOrderCustomerFromCurrent() {
    const orderId = q("#mgmt-order-id")?.value;
    const order = mgmt()?.orders.find(o => String(o.id) === String(orderId));
    let customerId = order?.customerId || "";
    if (!customerId && order?.customer?.email) {
      customerId = mgmt().customers.find(c => normalizeEmail(c.email) === normalizeEmail(order.customer.email))?.id || "";
    }
    q("#cp-order-customer-id").value = customerId;
    populateOrderCustomerSelect();
  }

  function persistOrderLink() {
    setTimeout(() => {
      const id = q("#mgmt-order-id")?.value;
      const number = q("#mgmt-order-number")?.value;
      const customerId = q("#cp-order-customer-id")?.value;
      const order = mgmt()?.orders.find(o => String(o.id) === String(id)) ||
                    mgmt()?.orders.find(o => String(o.number) === String(number));
      if (order) {
        if (customerId) order.customerId = customerId;
        else delete order.customerId;
        saveManagementDraft();
      }
      render();
    },0);
  }

  function setStatus(message,type="") {
    const el = q("#mgmt-status");
    if (!el) return;
    el.textContent = message;
    el.className = `form-status ${type}`;
  }

  function install() {
    q("#cp-add-customer")?.addEventListener("click",() => openCustomer());
    q("#cp-close-modal")?.addEventListener("click",closeCustomer);
    q("#cp-customer-form")?.addEventListener("submit",saveCustomer);
    q("#cp-delete-customer")?.addEventListener("click",deleteCustomer);
    q("#cp-search")?.addEventListener("input",render);
    q("#cp-status-filter")?.addEventListener("change",render);
    q("#cp-customer-modal")?.addEventListener("click",e => { if (e.target.id === "cp-customer-modal") closeCustomer(); });
    q("#cp-order-customer")?.addEventListener("change",e => fillOrderCustomer(e.target.value));
    q("#mgmt-order-form")?.addEventListener("submit",persistOrderLink);

    // The existing order editor opens its modal first; then this resolves the saved customer link.
    q("#mgmt-add-order-btn")?.addEventListener("click",() => setTimeout(setOrderCustomerFromCurrent,0));
    document.addEventListener("click",e => {
      if (e.target.closest(".mgmt-edit")) setTimeout(setOrderCustomerFromCurrent,0);
    });

    qa("[data-mgmt-view]").forEach(btn => {
      btn.addEventListener("click",() => {
        if (btn.dataset.mgmtView === "customerportal") render();
      });
    });

    const oldRenderAll = window.renderAll;
    if (typeof oldRenderAll === "function") {
      window.renderAll = function() {
        oldRenderAll();
        render();
      };
    }

    if (typeof storeData !== "undefined" && storeData) render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();