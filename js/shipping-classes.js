"use strict";
(function(){
  const R={brief:1,small:2,medium:3,large:4,xl:5,xxl:6,sperrgut:7};
  const pClass=p=>p?.shippingClass||"small";
  const needRank=()=>cart.reduce((r,i)=>Math.max(r,R[pClass(getProduct(i.id))]||2),1);
  const available=()=>Object.values(shippingMethods).filter(m=>m.active!==false).filter(m=>{
    const n=needRank(), min=R[m.minClass]||1, max=R[m.maxClass]||7; return n>=min&&n<=max;
  }).sort((a,b)=>a.price-b.price);
  function validKey(){let k=localStorage.getItem(SHIPPING_KEY)||"";const a=available();if(!a.some(m=>m.key===k)){k=a[0]?.key||Object.keys(shippingMethods)[0]||"";if(k)localStorage.setItem(SHIPPING_KEY,k);}return k;}
  function fillSelect(){const s=document.getElementById("shipping-method");if(!s)return;const a=available(),k=validKey();s.innerHTML=a.length?a.map(m=>`<option value="${escapeHtml(m.key)}">${escapeHtml(m.label)} – ${Number(m.price).toFixed(2)} €</option>`).join(""):'<option value="">Kein Versandtarif verfügbar</option>';s.value=k;s.disabled=!a.length;}
  window.addEventListener("neko-store-ready",e=>{const list=Array.isArray(e.detail?.shippingMethods)?e.detail.shippingMethods:[];shippingMethods=Object.fromEntries(list.map(i=>[i.key,{key:i.key,label:i.label||i.key,price:Number(i.price)||0,freeFrom:Number(i.freeFrom)||0,carrier:i.carrier||"",minClass:i.minClass||"brief",maxClass:i.maxClass||i.minClass||"sperrgut",active:i.active!==false}]));fillSelect();renderCart();});
  const oldRender=renderCart;renderCart=function(){fillSelect();return oldRender();};
  calculateCart=function(){
    const valid=cart.filter(i=>getProduct(i.id));if(valid.length!==cart.length){cart=valid;localStorage.setItem(CART_KEY,JSON.stringify(cart));}
    const subtotal=cart.reduce((s,i)=>s+Number(getProduct(i.id).price||0)*i.qty,0),code=getCoupon(),c=couponCodes[code];let discount=0;
    if(c?.type==="percent")discount=subtotal*c.value/100;if(c?.type==="fixed")discount=c.value;discount=Math.min(subtotal,discount);
    const key=validKey(),a=available(),shipping=shippingMethods[key]||a[0]||{key:"",label:"Kein Versandtarif",price:0,freeFrom:0};
    let shippingCost=subtotal===0?0:Number(shipping.price||0);if(shipping.freeFrom>0&&subtotal>=shipping.freeFrom)shippingCost=0;if(c?.type==="shipping")shippingCost=0;
    return{subtotal,discount,coupon:code,couponData:c,shippingKey:shipping.key,shipping,shippingCost,total:Math.max(0,subtotal-discount+shippingCost)};
  };
  setShippingMethod=function(k){if(!available().some(m=>m.key===k))return;localStorage.setItem(SHIPPING_KEY,k);renderCart();};
  const oldText=buildOrderText;buildOrderText=function(){const classes=[...new Set(cart.map(i=>pClass(getProduct(i.id))))];return `${oldText()}\nVersandklasse(n): ${classes.join(", ")}`;};
})();
