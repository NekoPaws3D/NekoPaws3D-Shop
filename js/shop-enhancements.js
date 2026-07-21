"use strict";
(function(){
 const classes=["brief","small","medium","large","xl","xxl","sperrgut"];
 const rank=v=>Math.max(0,classes.indexOf(v));
 function plan(){
   let r=0,w=0,p=1;
   cart.forEach(i=>{const x=getProduct(i.id);if(!x)return;r=Math.max(r,rank(x.shippingClass||"small"));w+=(Number(x.weightGrams)||0)*i.qty;p=Math.max(p,Math.ceil(i.qty/Math.max(1,Number(x.maxPerPackage)||9999)));});
   if(w>2000)r=Math.max(r,2);if(w>5000)r=Math.max(r,3);if(w>10000)r=Math.max(r,4);if(w>20000)r=Math.max(r,5);
   if(w>31500){p=Math.max(p,Math.ceil(w/31500));r=Math.max(r,5);}
   return{requiredClass:classes[r],totalWeight:w,packageUnits:p};
 }
 function state(x){const s=Number(x.stock)||0,t=Number(x.lowStockThreshold)||3;if(s<=0)return["soldout","Ausverkauft"];if(s<=t)return["low",`Nur noch ${s} Stück verfügbar`];return["ok",`${s} Stück verfügbar`];}
 function decorate(){
   document.querySelectorAll(".product-card,[data-product-id]").forEach(c=>{
     let id=c.dataset.productId||c.dataset.id;
     if(!id){const s=c.querySelector("[onclick*='addToCart']")?.getAttribute("onclick")||"";id=(s.match(/addToCart\((\d+)/)||[])[1];}
     const x=getProduct(id);if(!x||x.showStockWarning===false)return;
     const [type,text]=state(x);let b=c.querySelector(".stock-status-badge");if(!b){b=document.createElement("div");c.appendChild(b);}
     b.className=`stock-status-badge ${type}`;b.textContent=text;
     if(type==="soldout")c.querySelectorAll("[onclick*='addToCart']").forEach(btn=>{btn.disabled=true;btn.textContent="Ausverkauft";btn.removeAttribute("onclick");});
   });
 }
 const add=addToCart;addToCart=function(id,q=1,n=""){const x=getProduct(id),want=Math.max(1,Number(q)||1),inCart=cart.filter(i=>i.id===Number(id)).reduce((a,b)=>a+b.qty,0),s=Number(x?.stock)||0;if(s<=0){alert("Dieses Produkt ist leider ausverkauft.");return;}if(inCart+want>s){alert(`Es sind nur noch ${s} Stück verfügbar.`);return;}add(id,want,n);};
 const ch=changeQty;changeQty=function(id,a,n=""){if(Number(a)>0){const x=getProduct(id),t=cart.filter(i=>i.id===Number(id)).reduce((s,i)=>s+i.qty,0);if(x&&t>=(Number(x.stock)||0)){alert(`Es sind nur noch ${x.stock} Stück verfügbar.`);return;}}ch(id,a,n);};
 const calc=calculateCart;calculateCart=function(){const t=calc(),p=plan();if(t.shipping?.key!=="pickup"&&p.packageUnits>1){t.shippingCost*=p.packageUnits;t.total=Math.max(0,t.subtotal-t.discount+t.shippingCost);}t.packagePlan=p;return t;};
 const build=buildOrderText;buildOrderText=function(){const t=calculateCart(),p=t.packagePlan||plan();return `${build()}\nGesamtgewicht ca.: ${(p.totalWeight/1000).toFixed(2)} kg\nBenötigte Paketklasse: ${p.requiredClass}\nAnzahl Pakete: ${p.packageUnits}`;};
 const ensure=ensureOrderModal;ensureOrderModal=function(){ensure();const f=document.getElementById("order-form");if(!f||f.querySelector("#legal-confirmations"))return;const c=f.querySelector(".consent-check");if(!c)return;const d=document.createElement("div");d.id="legal-confirmations";d.innerHTML=`<div class="legal-notice"><b>Wichtiger Hinweis:</b> Dies ist zunächst eine unverbindliche Bestellanfrage. Ein Kaufvertrag entsteht erst nach persönlicher Bestätigung.</div><label class="consent-check"><input type="checkbox" required> Ich habe AGB und Widerrufsbelehrung gelesen und akzeptiere sie.</label><label class="consent-check"><input type="checkbox" required> Ich stimme der Datenverarbeitung gemäß Datenschutzerklärung zu.</label><label class="consent-check"><input type="checkbox"> Mir ist bekannt, dass bei personalisierten Produkten das Widerrufsrecht eingeschränkt oder ausgeschlossen sein kann.</label>`;c.parentNode.insertBefore(d,c);};
 const render=renderCart;renderCart=function(){render();const s=document.getElementById("cart-summary");if(s&&cart.length){const p=plan(),e=document.createElement("p");e.className="shipping-package-info";e.innerHTML=`<small>Geschätzt: ${(p.totalWeight/1000).toFixed(2)} kg · ${p.packageUnits} Paket(e) · Klasse ${p.requiredClass}</small>`;s.appendChild(e);}decorate();};
 window.addEventListener("neko-store-ready",()=>{if(!shippingMethods.pickup)shippingMethods.pickup={key:"pickup",label:"Kostenlose Abholung",price:0,freeFrom:0,carrier:"Abholung",minClass:"brief",maxClass:"sperrgut",active:true};setTimeout(()=>{decorate();renderCart();},0);});
 new MutationObserver(decorate).observe(document.documentElement,{childList:true,subtree:true});
})();
