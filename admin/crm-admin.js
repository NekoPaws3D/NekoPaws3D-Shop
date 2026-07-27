"use strict";
(() => {
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const euro = n => Number(n || 0).toLocaleString("de-DE", {style:"currency", currency:"EUR"});
  const normalize = v => String(v || "").trim().toLowerCase();
  const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = () => new Date().toISOString();
  const dateLabel = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("de-DE") : "–";
  const hasStore = () => typeof storeData !== "undefined" && !!storeData;

  function model() {
    if (!hasStore()) return null;
    storeData.management ||= {};
    const m = storeData.management;
    m.orders ||= [];
    m.customers ||= [];
    m.customerPortals ||= [];
    migrateOrderCustomers(m);
    return m;
  }

  function nextNumber(customers) {
    const year = new Date().getFullYear();
    const max = Math.max(0, ...customers.map(c => Number(String(c.number || "").match(/(\d+)$/)?.[1]) || 0));
    return `KD-${year}-${String(max + 1).padStart(4,"0")}`;
  }

  function migrateOrderCustomers(m) {
    const byEmail = new Map(m.customers.map(c => [normalize(c.email), c]).filter(([e]) => e));
    for (const o of m.orders) {
      const email = normalize(o.customer?.email);
      let c = o.customerId ? m.customers.find(x => String(x.id) === String(o.customerId)) : byEmail.get(email);
      if (!c && (email || o.customer?.name)) {
        c = {id:uuid(), number:nextNumber(m.customers), active:true, name:o.customer?.name||"", company:"", email:o.customer?.email||"", phone:o.customer?.phone||"", billingAddress:o.customer?.address||"", shippingAddress:o.customer?.address||"", tags:[], notes:"", followUp:"", createdAt:o.createdAt||now(), updatedAt:now()};
        m.customers.push(c);
        if (email) byEmail.set(email,c);
      }
      if (c) o.customerId ||= c.id;
    }
    for (const c of m.customers) {
      c.tags = Array.isArray(c.tags) ? c.tags : String(c.tags || "").split(",").map(x=>x.trim()).filter(Boolean);
      c.company ||= ""; c.followUp ||= ""; c.notes ||= "";
    }
  }

  function ordersFor(c) {
    const email = normalize(c.email);
    return (model()?.orders || []).filter(o => String(o.customerId || "") === String(c.id) || (!o.customerId && email && normalize(o.customer?.email) === email));
  }
  function revenue(c) { return ordersFor(c).filter(o => o.status !== "cancelled" && o.payment?.status !== "cancelled").reduce((s,o)=>s+Number(o.total||0),0); }
  function lastOrder(c) { return [...ordersFor(c)].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0]; }

  function saveDraft() {
    try { localStorage.setItem("nekopaws_management_draft_v1", JSON.stringify(model())); } catch {}
  }
  function status(text, type="") {
    const el=q("#mgmt-status"); if(!el) return; el.textContent=text; el.className=`form-status ${type}`;
  }

  function render() {
    const m=model(), box=q("#crm-customer-list");
    if(!m || !box) return;
    const search=normalize(q("#crm-search")?.value);
    const tag=q("#crm-tag-filter")?.value || "";
    const sort=q("#crm-sort")?.value || "name";
    let rows=m.customers.map(c=>({c,orders:ordersFor(c),revenue:revenue(c),last:lastOrder(c)}));
    rows=rows.filter(r => {
      const hay=normalize([r.c.number,r.c.name,r.c.company,r.c.email,r.c.phone,(r.c.tags||[]).join(" "),r.c.notes].join(" "));
      return (!search || hay.includes(search)) && (!tag || (r.c.tags||[]).includes(tag));
    });
    rows.sort((a,b)=> sort==="revenue" ? b.revenue-a.revenue : sort==="orders" ? b.orders.length-a.orders.length : sort==="recent" ? String(b.last?.date||"").localeCompare(String(a.last?.date||"")) : String(a.c.name||"").localeCompare(String(b.c.name||""),"de"));

    const all=m.customers;
    const totalRevenue=all.reduce((s,c)=>s+revenue(c),0);
    const due=all.filter(c=>c.followUp && c.followUp <= new Date().toISOString().slice(0,10)).length;
    q("#crm-dashboard").innerHTML = [["Kunden",all.length],["Aktive Kunden",all.filter(c=>c.active!==false).length],["Gesamtumsatz",euro(totalRevenue)],["Kontakt fällig",due]].map(([l,v])=>`<div class="mgmt-stat"><span>${l}</span><strong>${v}</strong></div>`).join("");

    box.innerHTML = rows.length ? rows.map(r=>`<article class="crm-card" data-crm-id="${esc(r.c.id)}">
      <div class="section-row"><div><h3>${esc(r.c.number)} · ${esc(r.c.name||"Ohne Namen")}</h3><p>${esc(r.c.company||r.c.email||"Keine Firma/E-Mail")}${r.c.phone?` · ${esc(r.c.phone)}`:""}</p></div><span class="mgmt-badge ${r.c.active===false?"payment-cancelled":"payment-paid"}">${r.c.active===false?"Inaktiv":"Aktiv"}</span></div>
      <div class="crm-tags">${(r.c.tags||[]).map(t=>`<span>${esc(t)}</span>`).join("")||"<small class=\"muted\">Keine Tags</small>"}</div>
      <div class="cp-customer-metrics"><span><b>${r.orders.length}</b> Bestellung(en)</span><span>Umsatz <b>${euro(r.revenue)}</b></span><span>Letzte Bestellung <b>${dateLabel(r.last?.date)}</b></span><span>Nächster Kontakt <b>${dateLabel(r.c.followUp)}</b></span></div>
      ${r.c.notes?`<p class="crm-note">${esc(r.c.notes)}</p>`:""}
      <div class="mgmt-actions"><button class="outline-btn crm-edit" type="button">Kundenakte öffnen</button><button class="outline-btn crm-new-order" type="button">Bestellung anlegen</button></div>
    </article>`).join("") : '<div class="mgmt-empty">Keine passenden CRM-Kunden gefunden.</div>';
    qa(".crm-edit").forEach(b=>b.onclick=()=>open(b.closest("[data-crm-id]").dataset.crmId));
    qa(".crm-new-order").forEach(b=>b.onclick=()=>newOrder(b.closest("[data-crm-id]").dataset.crmId));
  }

  function open(id="") {
    const m=model(); if(!m) return;
    const c=id ? m.customers.find(x=>String(x.id)===String(id)) : null;
    q("#crm-modal-title").textContent=c?"Kundenakte bearbeiten":"CRM-Kunde anlegen";
    q("#crm-customer-id").value=c?.id||""; q("#crm-number").value=c?.number||nextNumber(m.customers); q("#crm-active").value=String(c?.active!==false);
    q("#crm-name").value=c?.name||""; q("#crm-company").value=c?.company||""; q("#crm-email").value=c?.email||""; q("#crm-phone").value=c?.phone||"";
    q("#crm-tags").value=(c?.tags||[]).join(", "); q("#crm-billing-address").value=c?.billingAddress||""; q("#crm-shipping-address").value=c?.shippingAddress||""; q("#crm-notes").value=c?.notes||""; q("#crm-follow-up").value=c?.followUp||"";
    q("#crm-delete-customer").classList.toggle("hidden",!c);
    const history=q("#crm-history");
    if(c){ const orders=ordersFor(c); history.innerHTML=`<h3>Bestellhistorie</h3>${orders.length?orders.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(o=>`<div class="crm-history-row"><span><b>${esc(o.number||"Bestellung")}</b><small>${dateLabel(o.date)} · ${esc(o.status||"")}</small></span><strong>${euro(o.total)}</strong></div>`).join(""):'<p class="muted">Noch keine Bestellungen verknüpft.</p>'}`; } else history.innerHTML="";
    q("#crm-customer-modal").classList.remove("hidden");
  }
  function close(){q("#crm-customer-modal")?.classList.add("hidden");}

  function save(e){
    e.preventDefault(); const m=model(); if(!m) return status("Shopdaten sind noch nicht geladen.","error");
    const id=q("#crm-customer-id").value; let c=id?m.customers.find(x=>String(x.id)===String(id)):null;
    const email=q("#crm-email").value.trim();
    const duplicate=m.customers.find(x=>normalize(x.email) && normalize(x.email)===normalize(email) && String(x.id)!==String(id));
    if(duplicate) return status("Diese E-Mail-Adresse ist bereits einem anderen Kunden zugeordnet.","error");
    if(!c){ c={id:uuid(),createdAt:now()}; m.customers.push(c); }
    Object.assign(c,{number:q("#crm-number").value||nextNumber(m.customers),active:q("#crm-active").value==="true",name:q("#crm-name").value.trim(),company:q("#crm-company").value.trim(),email,phone:q("#crm-phone").value.trim(),tags:q("#crm-tags").value.split(",").map(x=>x.trim()).filter(Boolean),billingAddress:q("#crm-billing-address").value.trim(),shippingAddress:q("#crm-shipping-address").value.trim(),notes:q("#crm-notes").value.trim(),followUp:q("#crm-follow-up").value,updatedAt:now()});
    saveDraft(); close(); render(); status("Kundenakte gespeichert. Für die dauerhafte Veröffentlichung jetzt „Alles veröffentlichen“ anklicken.","success");
  }
  function remove(){
    const m=model(), id=q("#crm-customer-id").value, c=m?.customers.find(x=>String(x.id)===String(id)); if(!c) return;
    if(ordersFor(c).length) return status("Dieser Kunde ist mit Bestellungen verknüpft und kann nicht gelöscht werden. Setze ihn stattdessen auf inaktiv.","error");
    if(!confirm(`Kundenakte „${c.name}“ wirklich löschen?`)) return;
    m.customers=m.customers.filter(x=>String(x.id)!==String(id)); saveDraft(); close(); render(); status("Kundenakte gelöscht. Zum dauerhaften Speichern „Alles veröffentlichen“ anklicken.","success");
  }
  function newOrder(id){
    const c=model()?.customers.find(x=>String(x.id)===String(id)); if(!c) return;
    q("#mgmt-add-order-btn")?.click();
    setTimeout(()=>{ const sel=q("#cp-order-customer"); if(sel){sel.value=c.id; sel.dispatchEvent(new Event("change",{bubbles:true}));} },30);
  }

  function install(){
    q("#crm-add-customer")?.addEventListener("click",()=>open()); q("#crm-close-modal")?.addEventListener("click",close); q("#crm-customer-form")?.addEventListener("submit",save); q("#crm-delete-customer")?.addEventListener("click",remove);
    q("#crm-search")?.addEventListener("input",render); q("#crm-tag-filter")?.addEventListener("change",render); q("#crm-sort")?.addEventListener("change",render); q("#crm-customer-modal")?.addEventListener("click",e=>{if(e.target.id==="crm-customer-modal")close();});
    qa("[data-mgmt-view]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.mgmtView==="crm")render();}));
    const timer=setInterval(()=>{if(hasStore()){clearInterval(timer);render();}},100); setTimeout(()=>clearInterval(timer),10000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true}); else install();
})();
