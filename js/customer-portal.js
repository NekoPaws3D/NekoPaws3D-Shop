"use strict";
(() => {
  const STATUS = {
    payment_pending:"Zahlung ausstehend", paid:"Zahlung eingegangen",
    material_ordered:"Material bestellt", production:"In Produktion",
    quality_check:"Qualitätsprüfung", ready:"Versandbereit",
    shipped:"Verschickt", completed:"Abgeschlossen", cancelled:"Storniert"
  };
  let account = null;
  const q = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const euro = n => Number(n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
  const fmtDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("de-DE") : "–";
  const bytesToB64 = bytes => btoa(String.fromCharCode(...bytes));
  const b64ToBytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const normalizeEmail = value => String(value||"").trim().toLowerCase();

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return bytesToB64(new Uint8Array(await crypto.subtle.digest("SHA-256",data)));
  }

  async function deriveKey(code,salt) {
    const material = await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey(
      {name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},
      material,{name:"AES-GCM",length:256},false,["decrypt"]
    );
  }

  async function decryptAccount(entry,code) {
    const key = await deriveKey(code,b64ToBytes(entry.salt));
    const plain = await crypto.subtle.decrypt(
      {name:"AES-GCM",iv:b64ToBytes(entry.iv)},
      key,b64ToBytes(entry.cipher)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function loadStore() {
    const response = await fetch(`data/store.json?portal=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error("Kundendaten konnten nicht geladen werden.");
    return response.json();
  }

  async function login(event) {
    event.preventDefault();
    const status=q("#portal-login-status");
    status.textContent="Zugang wird geprüft …";status.className="portal-status";
    try{
      if(!window.crypto?.subtle) throw new Error("Dieser Browser unterstützt die sichere Anmeldung nicht.");
      const email=normalizeEmail(q("#portal-email").value);
      const code=q("#portal-code").value;
      const store=await loadStore();
      const entries=store?.management?.customerPortals||[];
      const emailHash=await sha256(email);
      const entry=entries.find(item=>item.emailHash===emailHash);
      if(!entry) throw new Error("Kein Kundenkonto für diese E-Mail-Adresse gefunden.");
      account=await decryptAccount(entry,code);
      sessionStorage.setItem("nekopaws_customer_session",JSON.stringify(account));
      showAccount();
      q("#portal-code").value="";
      status.textContent="";
    }catch(error){
      status.textContent = error.name==="OperationError"
        ? "E-Mail-Adresse oder Zugangscode ist nicht korrekt."
        : error.message;
      status.className="portal-status error";
    }
  }

  function showAccount() {
    if(!account)return;
    q("#portal-login").classList.add("hidden");
    q("#portal-account").classList.remove("hidden");
    q("#portal-customer-name").textContent=account.customer?.name||"";
    q("#portal-updated").textContent=`Zuletzt aktualisiert: ${new Date(account.updatedAt||Date.now()).toLocaleString("de-DE")}`;
    renderSummary();renderOrders();
  }

  function renderSummary() {
    const orders=account.orders||[];
    const open=orders.filter(o=>!["completed","cancelled"].includes(o.status)).length;
    const shipped=orders.filter(o=>o.status==="shipped").length;
    const invoices=orders.filter(o=>o.invoiceNumber).length;
    const total=orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0);
    q("#portal-summary").innerHTML=[
      ["Bestellungen",orders.length],["Offen",open],["Verschickt",shipped],
      ["Rechnungen",invoices],["Bestellwert",euro(total)]
    ].map(([l,v])=>`<div class="portal-stat"><span>${l}</span><strong>${v}</strong></div>`).join("");
  }

  function filteredOrders() {
    const filter=q("#portal-status-filter").value;
    const orders=[...(account.orders||[])];
    return orders.filter(o=>{
      if(!filter)return true;
      if(filter==="open")return !["shipped","completed","cancelled"].includes(o.status);
      return o.status===filter;
    }).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  }

  function renderOrders() {
    const box=q("#portal-orders");
    const orders=filteredOrders();
    if(!orders.length){box.innerHTML='<div class="portal-empty">Keine passenden Bestellungen vorhanden.</div>';return;}
    box.innerHTML=orders.map(o=>`
      <article class="portal-order" data-id="${esc(o.id)}">
        <div class="portal-order-top">
          <div><h3>${esc(o.number)}</h3><small>Bestellt am ${fmtDate(o.date)}</small></div>
          <strong>${euro(o.total)}</strong>
        </div>
        <div class="portal-order-meta">
          <span class="portal-badge">${esc(STATUS[o.status]||o.status)}</span>
          <span class="portal-badge">Zahlung: ${esc({open:"offen",paid:"bezahlt",cancelled:"storniert"}[o.payment?.status||"open"])}</span>
          ${o.invoiceNumber?`<span class="portal-badge">${esc(o.invoiceNumber)}</span>`:""}
        </div>
        <div class="portal-progress"><span style="width:${Math.min(100,Math.max(0,Number(o.progress||0)))}%"></span></div>
        <p class="portal-items">${esc(o.items||"Individueller Auftrag")}</p>
        ${o.tracking?`<p><b>Versand:</b> ${esc(o.carrier||"")} · <b>Tracking:</b> ${esc(o.tracking)}</p>`:""}
        <div class="portal-actions">
          ${o.invoiceNumber?'<button class="outline-btn portal-invoice" type="button">Rechnung anzeigen</button>':""}
          ${o.tracking?'<button class="outline-btn portal-tracking" type="button">Tracking öffnen</button>':""}
        </div>
      </article>`).join("");
    document.querySelectorAll(".portal-invoice").forEach(btn=>btn.onclick=()=>printInvoice(btn.closest("[data-id]").dataset.id));
    document.querySelectorAll(".portal-tracking").forEach(btn=>btn.onclick=()=>openTracking(btn.closest("[data-id]").dataset.id));
  }

  function printInvoice(id) {
    const o=(account.orders||[]).find(item=>String(item.id)===String(id));if(!o)return;
    const p=o.payment||{};
    q("#portal-print").innerHTML=`<div class="print-document">
      <header><h1>Rechnung ${esc(o.invoiceNumber)}</h1>
        <p><b>NekoPaws3D</b><br>Annika Morr<br>Georg-Büchner-Str. 23<br>Ludwigshafen<br>neko.paws3d@gmail.com</p>
      </header><hr>
      <div class="print-two">
        <p><b>Rechnung an:</b><br>${esc(account.customer?.name||"")}<br>${esc(account.customer?.address||"").replace(/\\n/g,"<br>")}<br>${esc(account.customer?.email||"")}</p>
        <p><b>Rechnungsdatum:</b> ${fmtDate(p.invoiceDate)}<br><b>Bestellnummer:</b> ${esc(o.number)}<br><b>Fällig am:</b> ${fmtDate(p.dueDate)}<br><b>Zahlungsstatus:</b> ${esc({open:"Offen",paid:"Bezahlt",cancelled:"Storniert"}[p.status||"open"])}</p>
      </div>
      <h2>Leistungen / Artikel</h2><div class="print-items">${esc(o.items||"Individueller Auftrag")}</div>
      <hr><h2>Gesamtbetrag: ${euro(o.total)}</h2>
      ${p.smallBusiness!==false?'<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.</p>':""}
      <p>Vielen Dank für deinen Auftrag!</p></div>`;
    setTimeout(()=>window.print(),50);
  }

  function openTracking(id) {
    const o=(account.orders||[]).find(item=>String(item.id)===String(id));if(!o?.tracking)return;
    const carrier=String(o.carrier||"").toLowerCase();
    let url="";
    if(carrier.includes("dhl")) url=`https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${encodeURIComponent(o.tracking)}`;
    else if(carrier.includes("hermes")) url=`https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${encodeURIComponent(o.tracking)}`;
    if(url) window.open(url,"_blank","noopener");
    else navigator.clipboard?.writeText(o.tracking).then(()=>alert("Trackingnummer wurde kopiert."));
  }

  function logout() {
    account=null;sessionStorage.removeItem("nekopaws_customer_session");
    q("#portal-account").classList.add("hidden");q("#portal-login").classList.remove("hidden");
  }

  function restoreSession() {
    try{
      const saved=JSON.parse(sessionStorage.getItem("nekopaws_customer_session")||"null");
      if(saved?.orders){account=saved;showAccount();}
    }catch{}
  }

  q("#portal-login-form")?.addEventListener("submit",login);
  q("#portal-logout")?.addEventListener("click",logout);
  q("#portal-status-filter")?.addEventListener("change",renderOrders);
  restoreSession();
})();