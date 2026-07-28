"use strict";
(function(){
  const form=document.getElementById("creator-form");
  if(!form)return;
  const DRAFT_KEY="nekopaws_creator_studio_draft_v1";
  const steps=[...document.querySelectorAll(".creator-step")];
  const progress=[...document.querySelectorAll("#creator-progress li")];
  const dynamic=document.getElementById("creator-dynamic-fields");
  const estimate=document.getElementById("creator-estimate");
  const summary=document.getElementById("creator-summary");
  const fileInput=document.getElementById("creator-files");
  const fileList=document.getElementById("creator-file-list");
  const status=document.getElementById("creator-status");
  const submit=document.getElementById("creator-submit");
  const next=document.getElementById("creator-next");
  const prev=document.getElementById("creator-prev");
  const clear=document.getElementById("creator-clear");
  const draftState=document.getElementById("creator-draft-state");
  let step=1;
  let chosenFiles=[];

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const type=()=>form.querySelector('[name="project_type"]:checked')?.value||"";
  const fieldTemplates={
    "Zeichenauftrag":`<label>Zeichenstil *<select name="drawing_style" required><option value="">Bitte wählen</option><option>Chibi</option><option>Anime / Manga</option><option>Cartoon</option><option>Fantasy</option><option>Realistisch</option><option>Anderer Stil</option></select></label><label>Anzahl Figuren *<input name="character_count" type="number" min="1" value="1" required></label><label>Hintergrund<select name="background"><option>Kein Hintergrund</option><option>Einfacher Hintergrund</option><option>Detaillierter Hintergrund</option></select></label><label>Nutzung<select name="usage_rights"><option>Privat</option><option>Social Media</option><option>Gewerblich / kommerziell</option></select></label>`,
    "3D-Druck":`<label>Material *<select name="material" required><option value="">Bitte wählen</option><option>PLA</option><option>PETG</option><option>Resin</option><option>Nach Beratung</option></select></label><label>Farbe<input name="color" placeholder="z. B. Schwarz/Pink"></label><label>Größe / Maße *<input name="dimensions" required placeholder="z. B. 15 cm Höhe"></label><label>Stückzahl *<input name="quantity" type="number" min="1" value="1" required></label><label>Oberfläche<select name="finish"><option>Standard</option><option>Geschliffen</option><option>Grundiert</option><option>Bemalt</option></select></label><label>Modell vorhanden?<select name="model_available"><option>Ja, Datei vorhanden</option><option>Nein, Modellierung gewünscht</option><option>Unsicher / Beratung</option></select></label>`,
    "Personalisierter Artikel":`<label>Artikelart *<select name="item_type" required><option value="">Bitte wählen</option><option>Textildruck</option><option>Schild / Namensschild</option><option>Schlüsselanhänger</option><option>Geschenkartikel</option><option>Andere</option></select></label><label>Personalisierung *<input name="personalization" required placeholder="Name, Text oder Motiv"></label><label>Farbe<input name="color" placeholder="Wunschfarbe"></label><label>Stückzahl *<input name="quantity" type="number" min="1" value="1" required></label>`,
    "Sonderanfertigung":`<label>Bereich *<select name="custom_area" required><option value="">Bitte wählen</option><option>3D-Druck + Bemalung</option><option>Illustration + Produkt</option><option>Event / Geschenk</option><option>Prototyp</option><option>Andere Idee</option></select></label><label>Gewünschte Stückzahl<input name="quantity" type="number" min="1" value="1"></label><label class="wide">Wichtigstes Ziel<input name="project_goal" placeholder="Was soll am Ende entstehen?"></label>`
  };
  const basePrices={"Zeichenauftrag":25,"3D-Druck":15,"Personalisierter Artikel":12,"Sonderanfertigung":35};

  function renderDynamic(saved={}){
    dynamic.innerHTML=fieldTemplates[type()]||'<div class="wide muted">Bitte zuerst eine Projektart auswählen.</div>';
    Object.entries(saved).forEach(([name,value])=>{const el=dynamic.querySelector(`[name="${CSS.escape(name)}"]`);if(el)el.value=value;});
    dynamic.querySelectorAll("input,select,textarea").forEach(el=>el.addEventListener("input",()=>{updateEstimate();saveDraft();}));
    updateEstimate();
  }
  function estimateValue(){
    let value=basePrices[type()]||0;
    const chars=Number(form.elements.character_count?.value||1);if(type()==="Zeichenauftrag")value+=Math.max(0,chars-1)*15;
    const qty=Number(form.elements.quantity?.value||1);if(type()!=="Zeichenauftrag")value+=Math.max(0,qty-1)*5;
    if(form.elements.background?.value==="Detaillierter Hintergrund")value+=25;
    if(form.elements.finish?.value==="Bemalt")value+=25;
    form.querySelectorAll('[name="extras"]:checked').forEach(el=>value+=Number(el.dataset.price||0));
    return value;
  }
  function updateEstimate(){const v=estimateValue();estimate.innerHTML=`<span>Unverbindliche Preisorientierung ab</span><strong>${v.toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</strong><small>Der endgültige Preis und Liefertermin werden persönlich bestätigt.</small>`;}
  function showStep(n){
    step=Math.max(1,Math.min(5,n));
    steps.forEach((el,i)=>el.classList.toggle("active",i===step-1));
    progress.forEach((el,i)=>{el.classList.toggle("active",i===step-1);el.classList.toggle("done",i<step-1);});
    prev.disabled=step===1;next.hidden=step===5;
    if(step===5)renderSummary();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function fieldsForStep(n){return [...steps[n-1].querySelectorAll("input,select,textarea")].filter(el=>el.type!=="file");}
  function validateStep(n){
    for(const el of fieldsForStep(n)){if(!el.checkValidity()){el.reportValidity();return false;}}
    if(n===1&&!type()){form.querySelector('[name="project_type"]')?.reportValidity();return false;}
    return true;
  }
  function serialize(){
    const data={};new FormData(form).forEach((value,key)=>{if(key==="extras"){data.extras||=[];data.extras.push(value);}else data[key]=value;});
    data.project_type=type();data.files=chosenFiles.map(f=>({name:f.name,size:f.size,type:f.type}));data.step=step;return data;
  }
  function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(serialize()));draftState.textContent="Entwurf automatisch gespeichert";}catch{draftState.textContent="Entwurf konnte nicht gespeichert werden";}}
  function restoreDraft(){
    try{const data=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");if(!data)return;
      Object.entries(data).forEach(([name,value])=>{if(["files","step","extras"].includes(name))return;const list=form.querySelectorAll(`[name="${CSS.escape(name)}"]`);list.forEach(el=>{if(el.type==="radio")el.checked=el.value===value;else if(el.type!=="checkbox")el.value=value??"";});});
      renderDynamic(data);(data.extras||[]).forEach(v=>{const el=form.querySelector(`[name="extras"][value="${CSS.escape(v)}"]`);if(el)el.checked=true;});
      draftState.textContent="Gespeicherter Entwurf wiederhergestellt";showStep(Number(data.step)||1);
    }catch{localStorage.removeItem(DRAFT_KEY);}
  }
  function renderFiles(){
    fileList.innerHTML=chosenFiles.map((f,i)=>{const image=f.type.startsWith("image/")?`<img src="${URL.createObjectURL(f)}" alt="Vorschau">`:'<div class="creator-file-icon">📎</div>';return `<article class="creator-file">${image}<b>${esc(f.name)}</b><small>${(f.size/1024/1024).toFixed(2)} MB</small><button class="outline-btn" type="button" data-remove-file="${i}">Entfernen</button></article>`;}).join("");
    fileList.querySelectorAll("[data-remove-file]").forEach(btn=>btn.onclick=()=>{chosenFiles.splice(Number(btn.dataset.removeFile),1);renderFiles();saveDraft();});
  }
  function entries(){
    const data=serialize();const labels={project_type:"Projektart",first_name:"Vorname",last_name:"Nachname",reply_to:"E-Mail",drawing_style:"Zeichenstil",character_count:"Anzahl Figuren",background:"Hintergrund",usage_rights:"Nutzung",material:"Material",color:"Farbe",dimensions:"Größe / Maße",quantity:"Stückzahl",finish:"Oberfläche",model_available:"Modell",item_type:"Artikelart",personalization:"Personalisierung",custom_area:"Bereich",project_goal:"Projektziel",budget:"Budget",desired_date:"Wunschtermin",description:"Beschreibung",notes:"Hinweise",file_link:"Freigabelink",extras:"Extras"};
    return Object.entries(data).filter(([k,v])=>!['step','files','privacy','nonbinding','reference_permission','legal'].includes(k)&&v!==""&&!(Array.isArray(v)&&!v.length)).map(([k,v])=>[labels[k]||k,Array.isArray(v)?v.join(", "):v]);
  }
  function renderSummary(){
    const files=chosenFiles.length?chosenFiles.map(f=>f.name).join("\n"):"Keine Dateien ausgewählt";
    summary.innerHTML=`<article><h4>Projekt</h4><dl>${entries().map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt>Referenzdateien</dt><dd>${esc(files)}</dd><dt>Preisorientierung</dt><dd>ab ${estimateValue().toLocaleString("de-DE",{style:"currency",currency:"EUR"})} (unverbindlich)</dd></dl></article>`;
  }
  function message(){return ["CREATOR STUDIO – NEUE PROJEKTANFRAGE","",...entries().map(([k,v])=>`${k}: ${v}`),`Referenzdateien: ${chosenFiles.map(f=>f.name).join(", ")||"keine"}`,`Preisorientierung: ab ${estimateValue()} € (unverbindlich)`,`Projekt-ID: CS-${Date.now().toString(36).toUpperCase()}`].join("\n");}

  form.addEventListener("change",e=>{if(e.target.name==="project_type")renderDynamic();updateEstimate();saveDraft();});
  form.addEventListener("input",saveDraft);
  next.onclick=()=>{if(validateStep(step)){showStep(step+1);saveDraft();}};
  prev.onclick=()=>showStep(step-1);
  clear.onclick=()=>{if(!confirm("Gespeicherten Entwurf wirklich löschen?"))return;localStorage.removeItem(DRAFT_KEY);form.reset();chosenFiles=[];renderFiles();renderDynamic();showStep(1);draftState.textContent="Entwurf gelöscht";};
  fileInput.addEventListener("change",()=>{const incoming=[...fileInput.files];const valid=incoming.filter(f=>f.size<=10*1024*1024);if(valid.length!==incoming.length)alert("Dateien über 10 MB wurden nicht übernommen.");chosenFiles=[...chosenFiles,...valid].slice(0,8);fileInput.value="";renderFiles();saveDraft();});
  form.addEventListener("submit",async e=>{
    e.preventDefault();if(!validateStep(5))return;submit.disabled=true;const old=submit.textContent;submit.textContent="Anfrage wird gesendet …";status.textContent="";status.className="form-status";
    try{
      const fullName=`${form.elements.first_name.value} ${form.elements.last_name.value}`.trim();
      await window.NekoMail.sendContact({from_name:fullName,name:fullName,reply_to:form.elements.reply_to.value,email:form.elements.reply_to.value,subject:`Neue Creator-Studio-Anfrage: ${type()}`,request_type:"Creator Studio",message:message(),customer_message:message(),to_email:window.NekoMail.getConfig().shopEmail||""});
      status.textContent="Deine Projektanfrage wurde erfolgreich gesendet. Du erhältst anschließend eine persönliche Rückmeldung.";status.className="form-status success";localStorage.removeItem(DRAFT_KEY);form.reset();chosenFiles=[];renderFiles();renderDynamic();showStep(1);draftState.textContent="Anfrage gesendet";
    }catch(err){console.error(err);status.textContent=`Senden fehlgeschlagen: ${err.message||err}`;status.className="form-status error";}
    finally{submit.disabled=false;submit.textContent=old;}
  });
  renderDynamic();restoreDraft();
})();
