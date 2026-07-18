"use strict";

const REPO_OWNER = "NekoPaws3D";
const REPO_NAME = "NekoPaws3D-Shop";
const BRANCH = "main";
const STORE_PATH = "data/store.json";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

let token = sessionStorage.getItem("nekopaws_admin_token") || "";
let storeData = null;
let storeSha = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function setStatus(id, message, type="") { const el=$(id); if(!el)return; el.textContent=message; el.className=`form-status ${type}`; }
function authHeaders(){return {"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28"};}
function utf8ToBase64(text){const bytes=new TextEncoder().encode(text);let binary="";bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary);}
function base64ToUtf8(value){const binary=atob(value.replace(/\n/g,""));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=reject;reader.readAsDataURL(file);});}
function safeFileName(name){const parts=name.toLowerCase().split(".");const ext=(parts.pop()||"jpg").replace(/[^a-z0-9]/g,"")||"jpg";const base=parts.join("-").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"produkt";return `${Date.now()}-${base}.${ext}`;}

async function githubFetch(path, options={}) {
  const response=await fetch(`${API_BASE}${path}`,{...options,headers:{...authHeaders(),...(options.headers||{})}});
  if(!response.ok){let detail="";try{detail=(await response.json()).message||"";}catch{}throw new Error(`${response.status}: ${detail||response.statusText}`);}
  return response.status===204?null:response.json();
}

async function login(){
  const input=$("#github-token");
  const button=$("#login-btn");
  token=(input?.value||"").trim();

  if(!token){
    setStatus("#login-status","Bitte GitHub-Token eingeben.","error");
    input?.focus();
    return;
  }

  button.disabled=true;
  button.textContent="Verbindung wird geprüft …";
  setStatus("#login-status","Shopdaten werden von GitHub geladen …");

  try{
    // Direkt die Shopdatei laden. Dadurch ist nur „Contents: Read and write“ nötig.
    await loadStore();
    sessionStorage.setItem("nekopaws_admin_token",token);
    $("#login-panel").classList.add("hidden");
    $("#admin-panel").classList.remove("hidden");
    $("#logout-btn").classList.remove("hidden");
    setStatus("#login-status","");
  }catch(error){
    sessionStorage.removeItem("nekopaws_admin_token");
    const message=error?.message||String(error);
    setStatus("#login-status",`Anmeldung fehlgeschlagen: ${message}`,"error");
  }finally{
    button.disabled=false;
    button.textContent="Mit GitHub verbinden";
  }
}

async function loadStore(){
  setStatus("#save-status","Daten werden geladen …");
  const file=await githubFetch(`/contents/${STORE_PATH}?ref=${BRANCH}`);
  storeSha=file.sha;storeData=JSON.parse(base64ToUtf8(file.content));
  renderAll();setStatus("#save-status","Shopdaten geladen.","success");
}

function renderAll(){renderProducts();renderCoupons();renderShipping();renderSettings();}
function nextProductId(){return Math.max(0,...(storeData.products||[]).map(p=>Number(p.id)||0))+1;}

function renderProducts(){
  const box=$("#products-editor");box.innerHTML="";
  (storeData.products||[]).sort((a,b)=>(a.sort||999)-(b.sort||999)).forEach(product=>box.appendChild(createProductEditor(product)));
}

function createProductEditor(product){
  const fragment=$("#product-template").content.cloneNode(true);const card=fragment.querySelector(".product-editor-card");card.dataset.id=product.id;
  const set=(sel,val)=>{const el=card.querySelector(sel);if(el.type==="checkbox")el.checked=Boolean(val);else el.value=val??"";};
  set(".p-id",product.id);set(".p-sort",product.sort);set(".p-name",product.name);set(".p-category",product.category);set(".p-price",product.priceOnRequest?"":product.price);set(".p-price-on-request",product.priceOnRequest);set(".p-stock",product.stock);set(".p-sku",product.sku);set(".p-description",product.description);set(".p-visible",product.visible!==false);set(".p-customizable",product.customizable);set(".p-featured",product.featured);
  card.querySelector(".product-heading").textContent=product.name||"Neues Produkt";
  const requestBox=card.querySelector(".p-price-on-request");
  const priceInput=card.querySelector(".p-price");
  const syncPriceMode=()=>{priceInput.disabled=requestBox.checked;if(requestBox.checked)priceInput.value="";};
  requestBox.onchange=syncPriceMode;
  syncPriceMode();
  renderImageList(card,product);
  card.querySelector(".delete-product").onclick=()=>{if(confirm(`Produkt „${product.name}“ löschen?`)){storeData.products=storeData.products.filter(p=>p!==product);renderProducts();}};
  card.querySelector(".duplicate-product").onclick=()=>{readEditors();const copy=structuredClone(product);copy.id=nextProductId();copy.name=`${copy.name} (Kopie)`;copy.sku=`${copy.sku||"NEKO"}-KOPIE`;copy.sort=(storeData.products.length+1);storeData.products.push(copy);renderProducts();};
  card.querySelector(".image-upload").onchange=event=>uploadImages(event,product,card);
  return card;
}

function renderImageList(card,product){const list=card.querySelector(".image-list");list.innerHTML="";(product.images||[]).forEach((src,index)=>{const tile=document.createElement("div");tile.className="image-tile";tile.innerHTML=`<img src="../${src}" alt="Produktbild"><small>${src}</small><button type="button" class="outline-btn danger">Entfernen</button>`;tile.querySelector("button").onclick=()=>{product.images.splice(index,1);product.image=product.images[0]||"";renderImageList(card,product);};list.appendChild(tile);});}

async function uploadImages(event,product,card){
  const files=[...event.target.files];if(!files.length)return;event.target.disabled=true;setStatus("#save-status",`${files.length} Bild(er) werden hochgeladen …`);
  try{
    for(const file of files){const filename=safeFileName(file.name);const path=`assets/products/${filename}`;const content=await fileToBase64(file);await githubFetch(`/contents/${path}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Produktbild ${filename} hochladen`,content,branch:BRANCH})});product.images=product.images||[];product.images.push(path);product.image=product.images[0];}
    renderImageList(card,product);setStatus("#save-status","Bilder wurden hochgeladen. Jetzt „Alles veröffentlichen“ klicken.","success");
  }catch(error){setStatus("#save-status",`Bild-Upload fehlgeschlagen: ${error.message}`,"error");}finally{event.target.disabled=false;event.target.value="";}
}

function readEditors(){
  $$(".product-editor-card").forEach(card=>{const product=storeData.products.find(p=>String(p.id)===String(card.dataset.id));if(!product)return;const val=sel=>card.querySelector(sel).value.trim();product.id=Number(val(".p-id"));product.sort=Number(val(".p-sort"))||999;product.name=val(".p-name");product.category=val(".p-category");product.priceOnRequest=card.querySelector(".p-price-on-request").checked;product.price=product.priceOnRequest?0:(Number(val(".p-price"))||0);product.stock=Number(val(".p-stock"))||0;product.sku=val(".p-sku");product.description=val(".p-description");product.visible=card.querySelector(".p-visible").checked;product.customizable=card.querySelector(".p-customizable").checked;product.featured=card.querySelector(".p-featured").checked;product.image=product.images?.[0]||product.image||"";});
}

function addProduct(){readEditors();const id=nextProductId();storeData.products.push({id,name:"Neues Produkt",category:"3D Druck",price:0,priceOnRequest:false,image:"",images:[],description:"",customizable:false,visible:false,stock:0,sku:`NEKO-${String(id).padStart(3,"0")}`,featured:false,sort:storeData.products.length+1});renderProducts();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});}

function renderCoupons(){const box=$("#coupons-editor");box.innerHTML="";(storeData.couponCodes||[]).forEach((coupon,index)=>{const row=document.createElement("div");row.className="coupon-row-admin";row.innerHTML=`<label>Code<input class="c-code" value="${coupon.code||""}"></label><label>Art<select class="c-type"><option value="percent">Prozent</option><option value="fixed">Euro</option><option value="shipping">Gratis Versand</option></select></label><label>Wert<input class="c-value" type="number" step="0.01" value="${coupon.value||0}"></label><label>Bezeichnung<input class="c-label" value="${coupon.label||""}"></label><label class="check"><input class="c-active" type="checkbox" ${coupon.active!==false?"checked":""}> Aktiv</label><button class="outline-btn danger" type="button">Löschen</button>`;row.querySelector(".c-type").value=coupon.type;row.querySelector("button").onclick=()=>{storeData.couponCodes.splice(index,1);renderCoupons();};box.appendChild(row);});}
function readCoupons(){storeData.couponCodes=$$(".coupon-row-admin").map(row=>({code:row.querySelector(".c-code").value.trim().toUpperCase(),type:row.querySelector(".c-type").value,value:Number(row.querySelector(".c-value").value)||0,label:row.querySelector(".c-label").value.trim(),active:row.querySelector(".c-active").checked})).filter(c=>c.code);}
function addCoupon(){readCoupons();storeData.couponCodes.push({code:"NEU",type:"percent",value:10,label:"Neuer Gutschein",active:false});renderCoupons();}

function renderShipping(){const box=$("#shipping-editor");box.innerHTML="";(storeData.shippingMethods||[]).forEach(item=>{const row=document.createElement("div");row.className="shipping-row-admin";row.innerHTML=`<label>Schlüssel<input class="s-key" value="${item.key||""}"></label><label>Name<input class="s-label" value="${item.label||""}"></label><label>Preis €<input class="s-price" type="number" step="0.01" value="${item.price||0}"></label><label>Kostenlos ab €<input class="s-free" type="number" step="0.01" value="${item.freeFrom||0}"></label>`;box.appendChild(row);});}
function readShipping(){storeData.shippingMethods=$$(".shipping-row-admin").map(row=>({key:row.querySelector(".s-key").value.trim(),label:row.querySelector(".s-label").value.trim(),price:Number(row.querySelector(".s-price").value)||0,freeFrom:Number(row.querySelector(".s-free").value)||0})).filter(s=>s.key);}

function renderSettings(){const site=storeData.site||{};$("#setting-shopname").value=site.shopName||"";$("#setting-tagline").value=site.tagline||"";$("#setting-email").value=site.contactEmail||"Neko.paws3d@gmail.com";$("#setting-hero-title").value=site.heroTitle||"";$("#setting-hero-text").value=site.heroText||"";}
function readSettings(){storeData.site={...(storeData.site||{}),shopName:$("#setting-shopname").value.trim(),tagline:$("#setting-tagline").value.trim(),contactEmail:$("#setting-email").value.trim(),heroTitle:$("#setting-hero-title").value.trim(),heroText:$("#setting-hero-text").value.trim()};}

async function saveAll(){
  readEditors();readCoupons();readShipping();readSettings();
  const button=$("#save-btn");button.disabled=true;setStatus("#save-status","Änderungen werden veröffentlicht …");
  try{const content=utf8ToBase64(JSON.stringify(storeData,null,2)+"\n");const result=await githubFetch(`/contents/${STORE_PATH}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Shop über Adminbereich aktualisiert",content,sha:storeSha,branch:BRANCH})});storeSha=result.content.sha;setStatus("#save-status","Erfolgreich veröffentlicht. GitHub Pages aktualisiert den Shop meist innerhalb weniger Minuten.","success");}
  catch(error){setStatus("#save-status",`Veröffentlichen fehlgeschlagen: ${error.message}`,"error");}
  finally{button.disabled=false;}
}

function switchTab(name){$$('.admin-tab').forEach(tab=>tab.classList.add('hidden'));$(`#tab-${name}`).classList.remove('hidden');$$('.admin-tabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===name));}
function logout(){sessionStorage.removeItem("nekopaws_admin_token");location.reload();}

function initAdmin(){
  const loginButton=$("#login-btn");
  if(!loginButton){
    console.error("Admin-Loginbutton wurde nicht gefunden.");
    return;
  }

  loginButton.addEventListener("click",login);
  $("#github-token").addEventListener("keydown",event=>{
    if(event.key==="Enter") login();
  });
  $("#save-btn").addEventListener("click",saveAll);
  $("#reload-btn").addEventListener("click",loadStore);
  $("#logout-btn").addEventListener("click",logout);
  $("#add-product-btn").addEventListener("click",addProduct);
  $("#add-coupon-btn").addEventListener("click",addCoupon);
  $$(".admin-tabs button").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));

  setStatus("#login-status","Adminbereich bereit.");
  if(token){
    $("#github-token").value=token;
  }
}

window.addEventListener("unhandledrejection",event=>{
  setStatus("#login-status",`Fehler: ${event.reason?.message||event.reason||"Unbekannter Fehler"}`,"error");
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initAdmin,{once:true});
}else{
  initAdmin();
}
