"use strict";
(function () {
  const STATUS = {
    payment_pending: "Zahlung ausstehend",
    paid: "Zahlung eingegangen",
    material_ordered: "Material bestellt",
    production: "In Produktion",
    quality_check: "Qualitätsprüfung",
    ready: "Versandbereit",
    shipped: "Verschickt",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
    new: "Zahlung ausstehend",
    processing: "Material bestellt"
  };
  const STATUS_ORDER = ["payment_pending","paid","material_ordered","production","quality_check","ready","shipped","completed","cancelled"];
  const STORAGE_KEY = "nekopaws_management_draft_v1";
  let currentId = null;

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today = () => new Date().toISOString().slice(0,10);
  const euro = n => Number(n || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
  const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function management() {
    if (!window.storeData) return {orders:[], invoiceCounter:1, version:2};
    storeData.management ||= {orders:[], invoiceCounter:1, customerPortals:[], version:3};
    storeData.management.orders ||= [];
    storeData.management.customerPortals ||= [];
    storeData.management.invoiceCounter ||= 1;
    storeData.management.version = 3;
    migrateOrders();
    return storeData.management;
  }

  function migrateOrders() {
    const m = storeData?.management;
    if (!m?.orders) return;
    for (const o of m.orders) {
      if (o.status === "new") o.status = "payment_pending";
      if (o.status === "processing") o.status = "material_ordered";
      o.payment ||= {};
      if (!o.payment.status) o.payment.status = o.status === "paid" ? "paid" : "open";
      if (!o.payment.days && o.payment.days !== 0) o.payment.days = 14;
      if (!o.payment.invoiceDate && o.invoiceNumber) o.payment.invoiceDate = o.date || today();
      if (!o.payment.dueDate && o.payment.invoiceDate) o.payment.dueDate = addDays(o.payment.invoiceDate, o.payment.days);
      if (typeof o.payment.smallBusiness !== "boolean") o.payment.smallBusiness = true;
    }
  }

  function addDays(dateString, days) {
    if (!dateString) return "";
    const d = new Date(`${dateString}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0,10);
  }

  function fmtDate(value) {
    if (!value) return "–";
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString("de-DE");
  }

  function nextOrderNumber() {
    const year = new Date().getFullYear();
    const nums = management().orders.map(o => Number(String(o.number || "").match(/(\d+)$/)?.[1]) || 0);
    return `NP-${year}-${String(Math.max(0,...nums)+1).padStart(4,"0")}`;
  }

  function nextInvoiceNumber() {
    const m = management();
    const number = `RE-${new Date().getFullYear()}-${String(m.invoiceCounter || 1).padStart(4,"0")}`;
    m.invoiceCounter = Number(m.invoiceCounter || 1) + 1;
    return number;
  }

  function setMgmtStatus(message,type="") {
    const el=q("#mgmt-status");
    if (!el) return;
    el.textContent=message;
    el.className=`form-status ${type}`;
  }

  function saveDraft() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(management())); } catch {}
  }

  function restoreDraftIfUseful() {
    if (!window.storeData) return;
    try {
      const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if (draft?.orders?.length && !storeData.management?.orders?.length) {
        storeData.management=draft;
        migrateOrders();
        setMgmtStatus("Lokaler Management-Entwurf wurde wiederhergestellt. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.","success");
      }
    } catch {}
  }

  function nonCancelled() {
    return management().orders.filter(o=>o.status!=="cancelled" && o.payment?.status!=="cancelled");
  }

  function renderDashboard() {
    const box=q("#mgmt-dashboard");
    if(!box||!window.storeData)return;
    const orders=management().orders;
    const open=orders.filter(o=>!["completed","cancelled"].includes(o.status)).length;
    const production=orders.filter(o=>["material_ordered","production","quality_check","ready"].includes(o.status)).length;
    const shipped=orders.filter(o=>o.status==="shipped").length;
    const revenue=nonCancelled().reduce((s,o)=>s+Number(o.total||0),0);
    const customers=new Set(orders.map(o=>(o.customer?.email||o.customer?.name||"").toLowerCase()).filter(Boolean)).size;
    box.innerHTML=[
      ["Offene Aufträge",open],["In Bearbeitung",production],["Verschickt",shipped],
      ["Kunden",customers],["Auftragswert",euro(revenue)]
    ].map(([label,value])=>`<div class="mgmt-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function filteredOrders() {
    const search=(q("#mgmt-search")?.value||"").toLowerCase().trim();
    const status=q("#mgmt-status-filter")?.value||"";
    return [...management().orders].filter(o=>{
      const hay=JSON.stringify(o).toLowerCase();
      return (!search||hay.includes(search))&&(!status||o.status===status);
    }).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  }

  function statusClass(status) {
    return `status-${String(status||"").replace(/[^a-z_]/g,"")}`;
  }

  function renderOrders() {
    const box=q("#mgmt-orders-list");
    if(!box||!window.storeData)return;
    const orders=filteredOrders();
    if(!orders.length){box.innerHTML='<div class="mgmt-empty">Noch keine passenden Bestellungen vorhanden.</div>';return;}
    box.innerHTML=orders.map(o=>`
      <article class="mgmt-order-card" data-order-id="${esc(o.id)}">
        <div class="mgmt-order-top">
          <div><h3>${esc(o.number)} · ${esc(o.customer?.name||"Ohne Namen")}</h3>
          <div class="mgmt-order-meta">
            <span class="mgmt-badge ${statusClass(o.status)}">${esc(STATUS[o.status]||o.status)}</span>
            <span class="mgmt-badge">${esc(o.category||"Sonstiges")}</span>
            <span class="mgmt-badge">Priorität: ${esc(o.priority||"normal")}</span>
            ${o.dueDate?`<span class="mgmt-badge">Fällig: ${fmtDate(o.dueDate)}</span>`:""}
            <span class="mgmt-badge payment-${esc(o.payment?.status||"open")}">Zahlung: ${esc({open:"offen",paid:"bezahlt",cancelled:"storniert"}[o.payment?.status||"open"])}</span>
          </div></div>
          <strong>${euro(o.total)}</strong>
        </div>
        <div class="mgmt-progress"><span style="width:${Math.min(100,Math.max(0,Number(o.progress||0)))}%"></span></div>
        <small>${Number(o.progress||0)} % · ${esc((o.items||"").split("\n")[0]||"Keine Artikelangabe")}</small>
        ${o.tracking?`<p><b>Tracking:</b> ${esc(o.carrier||"")} ${esc(o.tracking)}</p>`:""}
        <div class="mgmt-actions">
          <button class="outline-btn mgmt-edit" type="button">Bearbeiten</button>
          <button class="outline-btn mgmt-print" type="button">Rechnung</button>
          <button class="outline-btn mgmt-delivery-note" type="button">Lieferschein</button>
          <button class="outline-btn mgmt-packlist" type="button">Packliste</button>
          <button class="outline-btn mgmt-duplicate" type="button">Duplizieren</button>
        </div>
      </article>`).join("");
    qa(".mgmt-edit").forEach(b=>b.onclick=()=>openOrder(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-print").forEach(b=>b.onclick=()=>printInvoice(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-delivery-note").forEach(b=>b.onclick=()=>printDeliveryNote(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-packlist").forEach(b=>b.onclick=()=>printPackList(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-duplicate").forEach(b=>b.onclick=()=>duplicateOrder(b.closest("[data-order-id]").dataset.orderId));
  }

  function renderKanban() {
    const box=q("#mgmt-kanban");
    if(!box||!window.storeData)return;
    const columns=["payment_pending","paid","material_ordered","production","quality_check","ready","shipped"];
    box.innerHTML=columns.map(status=>`
      <section class="mgmt-column">
        <h3>${STATUS[status]}</h3>
        ${management().orders.filter(o=>o.status===status).map(o=>`
          <article class="mgmt-ticket ${statusClass(status)}" data-order-id="${esc(o.id)}">
            <b>${esc(o.number)}</b><br>${esc(o.customer?.name||"")}<br>
            <small>${esc(o.category||"")} · ${Number(o.progress||0)} %</small>
          </article>`).join("")||'<small class="muted">Leer</small>'}
      </section>`).join("");
    qa(".mgmt-ticket").forEach(el=>el.onclick=()=>openOrder(el.dataset.orderId));
  }

  function customerGroups() {
    const map=new Map();
    for(const o of management().orders){
      const key=(o.customer?.email||o.customer?.name||"unbekannt").toLowerCase();
      if(!map.has(key))map.set(key,{customer:o.customer||{},orders:[],total:0});
      const group=map.get(key);group.orders.push(o);
      if(o.status!=="cancelled")group.total+=Number(o.total||0);
    }
    return [...map.values()].sort((a,b)=>b.total-a.total);
  }

  const bytesToB64 = bytes => btoa(String.fromCharCode(...bytes));
  const b64ToBytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const normalizeEmail = value => String(value || "").trim().toLowerCase();

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return bytesToB64(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
  }

  async function derivePortalKey(code, salt, usages) {
    const material = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {name:"PBKDF2", salt, iterations:250000, hash:"SHA-256"},
      material, {name:"AES-GCM", length:256}, false, usages
    );
  }

  function customerPortalPayload(group) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      customer: {
        name: group.customer?.name || "",
        email: group.customer?.email || "",
        phone: group.customer?.phone || "",
        address: group.customer?.address || ""
      },
      orders: group.orders.map(o => ({
        id:o.id, number:o.number, date:o.date, status:o.status, category:o.category,
        progress:Number(o.progress||0), dueDate:o.dueDate, total:Number(o.total||0),
        items:o.items||"", carrier:o.carrier||"", tracking:o.tracking||"",
        shippedDate:o.shippedDate||"", invoiceNumber:o.invoiceNumber||"",
        payment:{
          invoiceDate:o.payment?.invoiceDate||"", days:Number(o.payment?.days??14),
          dueDate:o.payment?.dueDate||"", status:o.payment?.status||"open",
          paidDate:o.payment?.paidDate||"", smallBusiness:o.payment?.smallBusiness!==false
        }
      }))
    };
  }

  async function createPortalAccess(email) {
    if (!window.crypto?.subtle) {
      setMgmtStatus("Dieser Browser unterstützt die sichere Verschlüsselung nicht.", "error");
      return;
    }
    const group = customerGroups().find(g => normalizeEmail(g.customer?.email) === normalizeEmail(email));
    if (!group?.customer?.email) {
      setMgmtStatus("Für diesen Kunden ist keine E-Mail-Adresse hinterlegt.", "error");
      return;
    }
    const code = prompt("Persönlichen Zugangscode eingeben (mindestens 8 Zeichen):");
    if (code === null) return;
    if (code.length < 8) {
      setMgmtStatus("Der Zugangscode muss mindestens 8 Zeichen lang sein.", "error");
      return;
    }
    const confirmation = prompt("Zugangscode zur Bestätigung erneut eingeben:");
    if (confirmation !== code) {
      setMgmtStatus("Die Zugangscodes stimmen nicht überein.", "error");
      return;
    }

    try {
      setMgmtStatus("Kundenportal wird verschlüsselt …");
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await derivePortalKey(code, salt, ["encrypt"]);
      const plaintext = new TextEncoder().encode(JSON.stringify(customerPortalPayload(group)));
      const cipher = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plaintext));
      const emailHash = await sha256(normalizeEmail(group.customer.email));
      const entry = {emailHash, salt:bytesToB64(salt), iv:bytesToB64(iv), cipher:bytesToB64(cipher), updatedAt:new Date().toISOString()};
      const portals = management().customerPortals;
      const index = portals.findIndex(item => item.emailHash === emailHash);
      if (index >= 0) portals[index] = entry; else portals.push(entry);
      saveDraft();
      await renderCustomers();
      setMgmtStatus(`Kundenportal für ${group.customer.name || group.customer.email} erstellt. Zugangscode jetzt sicher an den Kunden übermitteln und anschließend „Alles veröffentlichen“ anklicken.`, "success");
    } catch (error) {
      setMgmtStatus(`Kundenportal konnte nicht erstellt werden: ${error.message}`, "error");
    }
  }

  async function deletePortalAccess(email) {
    const emailHash = await sha256(normalizeEmail(email));
    if (!confirm("Diesen Kundenportal-Zugang wirklich löschen?")) return;
    management().customerPortals = management().customerPortals.filter(item => item.emailHash !== emailHash);
    saveDraft();
    await renderCustomers();
    setMgmtStatus("Kundenportal-Zugang gelöscht. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.", "success");
  }

  async function renderCustomers() {
    const box=q("#mgmt-customers-list");
    if(!box||!window.storeData)return;
    const groups=customerGroups();
    const active = new Set((management().customerPortals||[]).map(p=>p.emailHash));
    const rows = await Promise.all(groups.map(async g => {
      const email = normalizeEmail(g.customer?.email);
      const hash = email ? await sha256(email) : "";
      return {g, hasPortal:active.has(hash)};
    }));
    box.innerHTML=rows.length?rows.map(({g,hasPortal})=>`
      <article class="mgmt-customer-card" data-customer-email="${esc(g.customer.email||"")}">
        <div class="section-row">
          <div>
            <h3>${esc(g.customer.name||"Unbekannt")}</h3>
            <p>${esc(g.customer.email||"")}${g.customer.phone?` · ${esc(g.customer.phone)}`:""}</p>
          </div>
          <span class="mgmt-badge ${hasPortal?"payment-paid":"payment-open"}">${hasPortal?"Portal aktiv":"Kein Portal"}</span>
        </div>
        <p><b>${g.orders.length}</b> Bestellung(en) · Gesamtwert <b>${euro(g.total)}</b></p>
        <small>${g.orders.map(o=>esc(o.number)).join(", ")}</small>
        <div class="mgmt-actions">
          <button class="outline-btn mgmt-create-portal" type="button" ${g.customer.email?"":"disabled"}>${hasPortal?"Portal aktualisieren":"Portal-Zugang erstellen"}</button>
          ${hasPortal?'<button class="outline-btn mgmt-delete-portal" type="button">Zugang löschen</button>':""}
        </div>
      </article>`).join(""):'<div class="mgmt-empty">Noch keine Kundendaten vorhanden.</div>';
    qa(".mgmt-create-portal").forEach(b=>b.onclick=()=>createPortalAccess(b.closest("[data-customer-email]").dataset.customerEmail));
    qa(".mgmt-delete-portal").forEach(b=>b.onclick=()=>deletePortalAccess(b.closest("[data-customer-email]").dataset.customerEmail));
  }

  function documentOrders() {
    const search=(q("#mgmt-document-search")?.value||"").toLowerCase().trim();
    const payment=q("#mgmt-payment-filter")?.value||"";
    return management().orders.filter(o=>{
      const hay=JSON.stringify(o).toLowerCase();
      return (!search||hay.includes(search))&&(!payment||(o.payment?.status||"open")===payment);
    });
  }

  function renderInvoices() {
    const box=q("#mgmt-invoices-list");
    if(!box||!window.storeData)return;
    const orders=documentOrders();
    box.innerHTML=orders.length?orders.map(o=>`
      <article class="mgmt-invoice-card" data-order-id="${esc(o.id)}">
        <div class="section-row">
          <div>
            <h3>${esc(o.invoiceNumber||"Noch keine Rechnungsnummer")}</h3>
            <p>${esc(o.number)} · ${esc(o.customer?.name||"")}</p>
            <small>Rechnungsdatum: ${fmtDate(o.payment?.invoiceDate)} · Fällig: ${fmtDate(o.payment?.dueDate)} · Zahlung: ${esc({open:"Offen",paid:"Bezahlt",cancelled:"Storniert"}[o.payment?.status||"open"])}</small>
          </div>
          <strong>${euro(o.total)}</strong>
        </div>
        <div class="mgmt-actions">
          <button class="outline-btn mgmt-create-invoice" type="button">${o.invoiceNumber?"Rechnung öffnen":"Rechnungsnummer erzeugen"}</button>
          <button class="outline-btn mgmt-doc-delivery" type="button">Lieferschein</button>
          <button class="outline-btn mgmt-doc-packlist" type="button">Packliste</button>
        </div>
      </article>`).join(""):'<div class="mgmt-empty">Noch keine Dokumente vorhanden.</div>';
    qa(".mgmt-create-invoice").forEach(b=>b.onclick=()=>printInvoice(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-doc-delivery").forEach(b=>b.onclick=()=>printDeliveryNote(b.closest("[data-order-id]").dataset.orderId));
    qa(".mgmt-doc-packlist").forEach(b=>b.onclick=()=>printPackList(b.closest("[data-order-id]").dataset.orderId));
  }

  function yearsAvailable() {
    const years=new Set(management().orders.map(o=>String(o.date||"").slice(0,4)).filter(Boolean));
    years.add(String(new Date().getFullYear()));
    return [...years].sort((a,b)=>b.localeCompare(a));
  }

  function selectedYear() {
    return q("#mgmt-stat-year")?.value||String(new Date().getFullYear());
  }

  function renderStatistics() {
    if(!window.storeData)return;
    const year=selectedYear();
    const orders=management().orders.filter(o=>String(o.date||"").startsWith(year));
    const valid=orders.filter(o=>o.status!=="cancelled"&&o.payment?.status!=="cancelled");
    const revenue=valid.reduce((s,o)=>s+Number(o.total||0),0);
    const paidRevenue=valid.filter(o=>o.payment?.status==="paid"||["paid","shipped","completed"].includes(o.status)).reduce((s,o)=>s+Number(o.total||0),0);
    const avg=valid.length?revenue/valid.length:0;
    const customers=new Set(orders.map(o=>(o.customer?.email||o.customer?.name||"").toLowerCase()).filter(Boolean)).size;
    const open=orders.filter(o=>!["completed","cancelled"].includes(o.status)).length;
    const completed=orders.filter(o=>o.status==="completed").length;

    const dash=q("#mgmt-stat-dashboard");
    if(dash)dash.innerHTML=[
      ["Umsatz",euro(revenue)],["Bezahlter Umsatz",euro(paidRevenue)],["Ø Bestellwert",euro(avg)],
      ["Bestellungen",orders.length],["Offene Aufträge",open],["Abgeschlossen",completed],["Kunden",customers]
    ].map(([l,v])=>`<div class="mgmt-stat"><span>${l}</span><strong>${v}</strong></div>`).join("");

    const monthRevenue=Array(12).fill(0),monthOrders=Array(12).fill(0),monthCustomers=Array(12).fill(0);
    const seenByMonth=Array.from({length:12},()=>new Set());
    for(const o of orders){
      const m=Math.max(0,Math.min(11,Number(String(o.date||"").slice(5,7))-1));
      monthOrders[m]++;
      if(o.status!=="cancelled"&&o.payment?.status!=="cancelled")monthRevenue[m]+=Number(o.total||0);
      const key=(o.customer?.email||o.customer?.name||"").toLowerCase();
      if(key)seenByMonth[m].add(key);
    }
    seenByMonth.forEach((s,i)=>monthCustomers[i]=s.size);
    renderBarChart("#mgmt-revenue-chart",monthRevenue,v=>euro(v));
    renderBarChart("#mgmt-orders-chart",monthOrders,v=>String(v));
    renderBarChart("#mgmt-customer-chart",monthCustomers,v=>String(v));

    const statusCounts={};
    for(const key of STATUS_ORDER)statusCounts[key]=orders.filter(o=>o.status===key).length;
    renderStatsList("#mgmt-status-stats",Object.entries(statusCounts).map(([k,v])=>[STATUS[k],v]));

    const categories={};
    for(const o of orders)categories[o.category||"Sonstiges"]=(categories[o.category||"Sonstiges"]||0)+1;
    renderStatsList("#mgmt-category-stats",Object.entries(categories).sort((a,b)=>b[1]-a[1]));
  }

  function renderBarChart(selector,values,formatter) {
    const box=q(selector);if(!box)return;
    const labels=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    const max=Math.max(1,...values);
    box.innerHTML=values.map((v,i)=>`<div class="bar-item" title="${esc(formatter(v))}">
      <div class="bar-value">${esc(formatter(v))}</div>
      <div class="bar-track"><span style="height:${Math.max(v?6:0,(v/max)*100)}%"></span></div>
      <small>${labels[i]}</small>
    </div>`).join("");
  }

  function renderStatsList(selector,rows) {
    const box=q(selector);if(!box)return;
    const max=Math.max(1,...rows.map(r=>Number(r[1]||0)));
    box.innerHTML=rows.length?rows.map(([label,value])=>`<div class="stats-row">
      <span>${esc(label)}</span><div class="stats-meter"><i style="width:${(Number(value||0)/max)*100}%"></i></div><b>${value}</b>
    </div>`).join(""):'<p class="muted">Keine Daten.</p>';
  }

  function renderAllManagement() {
    renderDashboard();renderOrders();renderKanban();renderCustomers();renderInvoices();renderStatistics();
  }

  function openOrder(id=null) {
    const modal=q("#mgmt-order-modal");if(!modal)return;
    currentId=id;
    const order=id?management().orders.find(o=>String(o.id)===String(id)):null;
    q("#mgmt-order-id").value=order?.id||"";
    q("#mgmt-order-number").value=order?.number||nextOrderNumber();
    q("#mgmt-order-date").value=order?.date||today();
    q("#mgmt-order-status").value=order?.status||"payment_pending";
    q("#mgmt-order-priority").value=order?.priority||"normal";
    q("#mgmt-order-category").value=order?.category||"3D-Druck";
    q("#mgmt-order-progress").value=Number(order?.progress||0);
    q("#mgmt-order-due").value=order?.dueDate||"";
    q("#mgmt-order-total").value=Number(order?.total||0);
    q("#mgmt-customer-name").value=order?.customer?.name||"";
    q("#mgmt-customer-email").value=order?.customer?.email||"";
    q("#mgmt-customer-phone").value=order?.customer?.phone||"";
    q("#mgmt-customer-address").value=order?.customer?.address||"";
    q("#mgmt-order-items").value=order?.items||"";
    q("#mgmt-order-carrier").value=order?.carrier||"";
    q("#mgmt-order-tracking").value=order?.tracking||"";
    q("#mgmt-order-shipped-date").value=order?.shippedDate||"";
    q("#mgmt-order-invoice").value=order?.invoiceNumber||"";
    q("#mgmt-invoice-date").value=order?.payment?.invoiceDate||"";
    q("#mgmt-payment-days").value=Number(order?.payment?.days??14);
    q("#mgmt-payment-due").value=order?.payment?.dueDate||"";
    q("#mgmt-payment-status").value=order?.payment?.status||"open";
    q("#mgmt-paid-date").value=order?.payment?.paidDate||"";
    q("#mgmt-small-business").checked=order?.payment?.smallBusiness!==false;
    q("#mgmt-order-notes").value=order?.notes||"";
    q("#mgmt-delete-order").classList.toggle("hidden",!order);
    modal.classList.remove("hidden");
    document.body.classList.add("mgmt-modal-open");
  }

  function closeOrder() {
    q("#mgmt-order-modal")?.classList.add("hidden");
    document.body.classList.remove("mgmt-modal-open");
    currentId=null;
  }

  function saveOrder(event) {
    event.preventDefault();
    const existing=currentId?management().orders.find(o=>String(o.id)===String(currentId)):null;
    const invoiceDate=q("#mgmt-invoice-date").value;
    const days=Number(q("#mgmt-payment-days").value||0);
    const order=existing||{id:uuid(),createdAt:new Date().toISOString()};
    Object.assign(order,{
      number:q("#mgmt-order-number").value.trim()||nextOrderNumber(),
      date:q("#mgmt-order-date").value||today(),
      status:q("#mgmt-order-status").value,
      priority:q("#mgmt-order-priority").value,
      category:q("#mgmt-order-category").value,
      progress:Number(q("#mgmt-order-progress").value||0),
      dueDate:q("#mgmt-order-due").value,
      total:Number(q("#mgmt-order-total").value||0),
      customer:{
        name:q("#mgmt-customer-name").value.trim(),
        email:q("#mgmt-customer-email").value.trim(),
        phone:q("#mgmt-customer-phone").value.trim(),
        address:q("#mgmt-customer-address").value.trim()
      },
      items:q("#mgmt-order-items").value.trim(),
      carrier:q("#mgmt-order-carrier").value,
      tracking:q("#mgmt-order-tracking").value.trim(),
      shippedDate:q("#mgmt-order-shipped-date").value,
      invoiceNumber:q("#mgmt-order-invoice").value.trim(),
      payment:{
        invoiceDate,
        days,
        dueDate:q("#mgmt-payment-due").value||addDays(invoiceDate,days),
        status:q("#mgmt-payment-status").value,
        paidDate:q("#mgmt-paid-date").value,
        smallBusiness:q("#mgmt-small-business").checked
      },
      notes:q("#mgmt-order-notes").value.trim(),
      updatedAt:new Date().toISOString()
    });
    if(!existing)management().orders.unshift(order);
    saveDraft();closeOrder();renderAllManagement();
    setMgmtStatus("Bestellung gespeichert. Für die dauerhafte Speicherung jetzt „Alles veröffentlichen“ anklicken.","success");
  }

  function deleteOrder() {
    if(!currentId||!confirm("Diese Bestellung wirklich löschen?"))return;
    storeData.management.orders=management().orders.filter(o=>String(o.id)!==String(currentId));
    saveDraft();closeOrder();renderAllManagement();
  }

  function duplicateOrder(id) {
    const source=management().orders.find(o=>String(o.id)===String(id));if(!source)return;
    const copy=structuredClone(source);
    copy.id=uuid();copy.number=nextOrderNumber();copy.status="payment_pending";copy.progress=0;
    copy.invoiceNumber="";copy.tracking="";copy.shippedDate="";copy.date=today();
    copy.payment={invoiceDate:"",days:14,dueDate:"",status:"open",paidDate:"",smallBusiness:true};
    management().orders.unshift(copy);saveDraft();renderAllManagement();
  }

  function ensureInvoice(order) {
    if(!order.invoiceNumber)order.invoiceNumber=nextInvoiceNumber();
    order.payment||={};
    if(!order.payment.invoiceDate)order.payment.invoiceDate=today();
    if(order.payment.days===undefined)order.payment.days=14;
    if(!order.payment.dueDate)order.payment.dueDate=addDays(order.payment.invoiceDate,order.payment.days);
    if(!order.payment.status)order.payment.status="open";
    if(typeof order.payment.smallBusiness!=="boolean")order.payment.smallBusiness=true;
    saveDraft();
  }

  function companyBlock() {
    return `<p><b>NekoPaws3D</b><br>Annika Morr<br>Georg-Büchner-Str. 23<br>Ludwigshafen<br>neko.paws3d@gmail.com</p>`;
  }

  function printDocument(title,body) {
    q("#mgmt-invoice-print")?.remove();
    const printable=document.createElement("section");
    printable.id="mgmt-invoice-print";
    printable.className="invoice-print";
    printable.innerHTML=`<div class="print-document"><header><h1>${title}</h1>${companyBlock()}</header>${body}</div>`;
    document.body.appendChild(printable);
    setTimeout(()=>window.print(),50);
  }

  function printInvoice(id) {
    const order=management().orders.find(o=>String(o.id)===String(id));if(!order)return;
    ensureInvoice(order);
    const paymentLabel={open:"Offen",paid:"Bezahlt",cancelled:"Storniert"}[order.payment.status]||order.payment.status;
    printDocument(`Rechnung ${esc(order.invoiceNumber)}`,`
      <hr>
      <div class="print-two-columns">
        <p><b>Rechnung an:</b><br>${esc(order.customer?.name||"")}<br>${esc(order.customer?.address||"").replace(/\n/g,"<br>")}<br>${esc(order.customer?.email||"")}</p>
        <p><b>Rechnungsdatum:</b> ${fmtDate(order.payment.invoiceDate)}<br><b>Bestellnummer:</b> ${esc(order.number)}<br><b>Fällig am:</b> ${fmtDate(order.payment.dueDate)}<br><b>Zahlungsstatus:</b> ${esc(paymentLabel)}${order.payment.paidDate?`<br><b>Bezahlt am:</b> ${fmtDate(order.payment.paidDate)}`:""}</p>
      </div>
      <h2>Leistungen / Artikel</h2>
      <div class="print-items">${esc(order.items||"Individueller Auftrag").replace(/\n/g,"<br>")}</div>
      <hr><h2>Gesamtbetrag: ${euro(order.total)}</h2>
      <p>Zahlungsziel: ${Number(order.payment.days||0)} Tage. Bitte bei der Zahlung die Rechnungsnummer angeben.</p>
      ${order.payment.smallBusiness?'<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.</p>':""}
      <p>Vielen Dank für deinen Auftrag!</p>`);
    renderAllManagement();
  }

  function printDeliveryNote(id) {
    const order=management().orders.find(o=>String(o.id)===String(id));if(!order)return;
    printDocument(`Lieferschein ${esc(order.number)}`,`
      <hr>
      <div class="print-two-columns">
        <p><b>Lieferadresse:</b><br>${esc(order.customer?.name||"")}<br>${esc(order.customer?.address||"").replace(/\n/g,"<br>")}</p>
        <p><b>Bestelldatum:</b> ${fmtDate(order.date)}<br><b>Versanddatum:</b> ${fmtDate(order.shippedDate)}<br><b>Versanddienst:</b> ${esc(order.carrier||"–")}<br><b>Tracking:</b> ${esc(order.tracking||"–")}</p>
      </div>
      <h2>Gelieferte Artikel / Leistungen</h2>
      <div class="print-items no-prices">${esc(order.items||"Individueller Auftrag").replace(/\n/g,"<br>")}</div>
      <p class="signature-line">Kontrolle / Unterschrift: ____________________________________</p>`);
  }

  function printPackList(id) {
    const order=management().orders.find(o=>String(o.id)===String(id));if(!order)return;
    printDocument(`Packliste ${esc(order.number)}`,`
      <hr>
      <p><b>Kunde:</b> ${esc(order.customer?.name||"")}<br><b>Versand:</b> ${esc(order.carrier||"–")}<br><b>Tracking:</b> ${esc(order.tracking||"–")}</p>
      <h2>Einzupacken</h2>
      <div class="pack-items">${String(order.items||"Individueller Auftrag").split("\n").filter(Boolean).map(line=>`<p>☐ ${esc(line)}</p>`).join("")}</div>
      <h2>Verpackungskontrolle</h2>
      <p>☐ Artikel geprüft &nbsp;&nbsp; ☐ Sicher verpackt &nbsp;&nbsp; ☐ Lieferschein beigelegt &nbsp;&nbsp; ☐ Versandlabel angebracht</p>`);
  }

  function exportManagement() {
    const blob=new Blob([JSON.stringify(management(),null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`NekoPaws3D-Management-${today()}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function importManagement(event) {
    const file=event.target.files?.[0];if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(!Array.isArray(data.orders))throw new Error("Ungültiges Backupformat");
      if(!confirm(`${data.orders.length} Bestellung(en) importieren und vorhandene Managementdaten ersetzen?`))return;
      storeData.management=data;migrateOrders();saveDraft();renderAllManagement();
      setMgmtStatus("Backup importiert. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.","success");
    }catch(e){setMgmtStatus(`Import fehlgeschlagen: ${e.message}`,"error");}
    finally{event.target.value="";}
  }

  function updateDueDate() {
    const date=q("#mgmt-invoice-date")?.value;
    const days=Number(q("#mgmt-payment-days")?.value||0);
    if(date&&q("#mgmt-payment-due"))q("#mgmt-payment-due").value=addDays(date,days);
  }

  function install() {
    const originalRenderAll=window.renderAll;
    if(typeof originalRenderAll==="function"){
      window.renderAll=function(){originalRenderAll();restoreDraftIfUseful();populateYears();renderAllManagement();};
    }
    const originalSaveAll=window.saveAll;
    if(typeof originalSaveAll==="function"){
      window.saveAll=async function(){saveDraft();await originalSaveAll();};
    }

    q("#mgmt-add-order-btn")?.addEventListener("click",()=>openOrder());
    q("#mgmt-close-modal")?.addEventListener("click",closeOrder);
    q("#mgmt-order-form")?.addEventListener("submit",saveOrder);
    q("#mgmt-delete-order")?.addEventListener("click",deleteOrder);
    q("#mgmt-search")?.addEventListener("input",renderOrders);
    q("#mgmt-status-filter")?.addEventListener("change",renderOrders);
    q("#mgmt-document-search")?.addEventListener("input",renderInvoices);
    q("#mgmt-payment-filter")?.addEventListener("change",renderInvoices);
    q("#mgmt-export-btn")?.addEventListener("click",exportManagement);
    q("#mgmt-import-input")?.addEventListener("change",importManagement);
    q("#mgmt-order-modal")?.addEventListener("click",e=>{if(e.target.id==="mgmt-order-modal")closeOrder();});
    q("#mgmt-invoice-date")?.addEventListener("change",updateDueDate);
    q("#mgmt-payment-days")?.addEventListener("input",updateDueDate);
    q("#mgmt-payment-status")?.addEventListener("change",()=>{
      if(q("#mgmt-payment-status").value==="paid"&&!q("#mgmt-paid-date").value)q("#mgmt-paid-date").value=today();
    });
    q("#mgmt-stat-year")?.addEventListener("change",renderStatistics);

    qa("[data-mgmt-view]").forEach(btn=>btn.addEventListener("click",()=>{
      qa("[data-mgmt-view]").forEach(b=>b.classList.toggle("active",b===btn));
      qa(".mgmt-view").forEach(v=>v.classList.add("hidden"));
      q(`#mgmt-view-${btn.dataset.mgmtView}`)?.classList.remove("hidden");
      if(btn.dataset.mgmtView==="statistics")renderStatistics();
    }));

    if(window.storeData){restoreDraftIfUseful();populateYears();renderAllManagement();}
  }

  function populateYears() {
    const select=q("#mgmt-stat-year");if(!select||!window.storeData)return;
    const current=select.value;
    select.innerHTML=yearsAvailable().map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join("");
    if(current&&yearsAvailable().includes(current))select.value=current;
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();