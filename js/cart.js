"use strict";

const CART_KEY = "nekopaws_cart";
const SHIPPING_KEY = "nekopaws_shipping";
const COUPON_KEY = "nekopaws_coupon";
let cart = (() => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } })();

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
function getProduct(id){return products.find(product=>product.id===Number(id));}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart();}
function addToCart(id,qty=1,note=""){const product=getProduct(id);if(!product)return;const clean=String(note||"").trim();const existing=cart.find(item=>item.id===product.id&&item.note===clean);if(existing)existing.qty+=Math.max(1,Number(qty)||1);else cart.push({id:product.id,qty:Math.max(1,Number(qty)||1),note:clean});saveCart();openCart();}
function changeQty(id,amount,encodedNote=""){const note=decodeURIComponent(encodedNote||"");const item=cart.find(entry=>entry.id===Number(id)&&entry.note===note);if(!item)return;item.qty+=Number(amount);if(item.qty<=0)cart=cart.filter(entry=>entry!==item);saveCart();}
function removeItem(id,encodedNote=""){const note=decodeURIComponent(encodedNote||"");cart=cart.filter(entry=>!(entry.id===Number(id)&&entry.note===note));saveCart();}
function clearCart(){if(cart.length&&confirm("Warenkorb wirklich vollständig leeren?")){cart=[];localStorage.removeItem(CART_KEY);renderCart();}}
function openCart(){document.getElementById("cart")?.classList.remove("hidden");renderCart();}
function closeCart(){document.getElementById("cart")?.classList.add("hidden");}
function getShippingMethod(){return localStorage.getItem(SHIPPING_KEY)||"hermes";}
function setShippingMethod(method){if(shippingMethods[method])localStorage.setItem(SHIPPING_KEY,method);renderCart();}
function getCoupon(){return(localStorage.getItem(COUPON_KEY)||"").trim().toUpperCase();}
function applyCoupon(){const code=(document.getElementById("coupon-code")?.value||"").trim().toUpperCase();if(!couponCodes[code]){localStorage.removeItem(COUPON_KEY);renderCart();alert("Dieser Gutscheincode ist ungültig.");return;}localStorage.setItem(COUPON_KEY,code);renderCart();alert(`Gutscheincode ${code} wurde angewendet.`);}
function clearCoupon(){localStorage.removeItem(COUPON_KEY);const input=document.getElementById("coupon-code");if(input)input.value="";renderCart();}
function calculateCart(){const subtotal=cart.reduce((sum,item)=>{const product=getProduct(item.id);return product?sum+product.price*item.qty:sum;},0);const coupon=getCoupon();const data=couponCodes[coupon];let discount=data?.type==="percent"?subtotal*data.value/100:data?.type==="fixed"?data.value:0;discount=Math.min(subtotal,discount);const shippingKey=getShippingMethod();const shipping=shippingMethods[shippingKey]||shippingMethods.hermes;let shippingCost=subtotal===0||subtotal>=shipping.freeFrom?0:shipping.price;if(data?.type==="shipping")shippingCost=0;return{subtotal,discount,coupon,data,shippingKey,shipping,shippingCost,total:Math.max(0,subtotal-discount+shippingCost)};}
function renderCart(){const items=document.getElementById("cart-items"),summary=document.getElementById("cart-summary"),count=document.getElementById("cart-count");if(count)count.textContent=String(cart.reduce((sum,item)=>sum+item.qty,0));if(!items||!summary)return;const totals=calculateCart();items.innerHTML=cart.length?cart.map(item=>{const product=getProduct(item.id);if(!product)return"";const note=encodeURIComponent(item.note||"");return`<article class="cart-item"><b>${escapeHtml(product.name)}</b><div>${product.price.toFixed(2)} € × ${item.qty} = ${(product.price*item.qty).toFixed(2)} €</div>${item.note?`<small>Wunsch: ${escapeHtml(item.note)}</small>`:""}<div class="cart-row-actions"><button onclick="changeQty(${item.id},-1,'${note}')">−</button><button onclick="changeQty(${item.id},1,'${note}')">+</button><button onclick="removeItem(${item.id},'${note}')">Entfernen</button></div></article>`;}).join(""):'<p class="muted">Dein Warenkorb ist leer.</p>';const input=document.getElementById("coupon-code"),select=document.getElementById("shipping-method");if(input&&document.activeElement!==input)input.value=totals.coupon;if(select)select.value=totals.shippingKey;summary.innerHTML=`<p>Zwischensumme: <b>${totals.subtotal.toFixed(2)} €</b></p><p>Rabatt: <b>−${totals.discount.toFixed(2)} €</b></p><p>${escapeHtml(totals.shipping.label)}: <b>${totals.shippingCost.toFixed(2)} €</b></p><h3>Gesamt: ${totals.total.toFixed(2)} €</h3>`;}

function buildOrderText() {
  const totals = calculateCart();
  const lines = cart.map(item => {
    const product = getProduct(item.id);
    if (!product) return "";
    return `${product.name} | Menge: ${item.qty} | Einzelpreis: ${product.price.toFixed(2)} € | Summe: ${(product.price * item.qty).toFixed(2)} €${item.note ? ` | Wunsch: ${item.note}` : ""}`;
  }).filter(Boolean);
  lines.push("");
  lines.push(`Zwischensumme: ${totals.subtotal.toFixed(2)} €`);
  lines.push(`Gutschein: ${totals.coupon || "kein Code"}`);
  lines.push(`Rabatt: -${totals.discount.toFixed(2)} €`);
  lines.push(`Versand: ${totals.shipping.label} (${totals.shippingCost.toFixed(2)} €)`);
  lines.push(`Gesamt: ${totals.total.toFixed(2)} €`);
  return lines.join("\n");
}

function ensureOrderModal() {
  if (document.getElementById("order-modal")) return;
  const wrapper = document.createElement("div");
  wrapper.id = "order-modal";
  wrapper.className = "order-modal hidden";
  wrapper.innerHTML = `
    <div class="order-card" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <h2 id="order-title">Bestellanfrage senden</h2>
      <p>Die Bestellung wird als E-Mail an NekoPaws3D gesendet. Eine Zahlung erfolgt erst nach persönlicher Bestätigung.</p>
      <form id="order-form" onsubmit="submitOrderEmail(event)">
        <input type="hidden" id="order-details" name="order_details">
        <input type="hidden" id="order-total" name="order_total">
        <input type="hidden" id="order-coupon" name="coupon">
        <input type="hidden" id="order-shipping" name="shipping">

        <div class="order-grid">
          <div><label for="order-firstname">Vorname *</label><input id="order-firstname" name="first_name" required autocomplete="given-name"></div>
          <div><label for="order-lastname">Nachname *</label><input id="order-lastname" name="last_name" required autocomplete="family-name"></div>
          <div class="wide"><label for="order-email">E-Mail *</label><input id="order-email" type="email" name="reply_to" required autocomplete="email"></div>
          <div class="wide"><label for="order-phone">Telefon (optional)</label><input id="order-phone" type="tel" name="phone" autocomplete="tel"></div>
          <div class="wide"><label for="order-street">Straße und Hausnummer *</label><input id="order-street" name="street" required autocomplete="street-address"></div>
          <div><label for="order-zip">PLZ *</label><input id="order-zip" name="postal_code" required inputmode="numeric" autocomplete="postal-code"></div>
          <div><label for="order-city">Ort *</label><input id="order-city" name="city" required autocomplete="address-level2"></div>
          <div class="wide"><label for="order-notes">Zusätzliche Nachricht</label><textarea id="order-notes" name="customer_message" rows="4"></textarea></div>
        </div>

        <h3>Bestellübersicht</h3>
        <pre id="order-preview" class="order-preview"></pre>

        <label class="consent-check">
          <input type="checkbox" required>
          Ich bestätige die Richtigkeit meiner Angaben und stimme der Übermittlung per E-Mail zur Bearbeitung meiner Bestellanfrage zu.
        </label>

        <div class="order-actions">
          <button class="main-btn" id="order-submit-btn" type="submit">Bestellung per E-Mail senden</button>
          <button class="outline-btn" type="button" onclick="closeOrderModal()">Abbrechen</button>
        </div>
        <p id="order-status" class="form-status" role="status" aria-live="polite"></p>
      </form>
      <small class="muted">Der E-Mail-Versand erfolgt über EmailJS. Zugangsdaten stehen in js/email-config.js.</small>
    </div>`;
  document.body.appendChild(wrapper);
}

function checkout() {
  if (!cart.length) {
    alert("Der Warenkorb ist leer.");
    return;
  }
  ensureOrderModal();
  const totals = calculateCart();
  document.getElementById("order-preview").textContent = buildOrderText();
  document.getElementById("order-details").value = buildOrderText();
  document.getElementById("order-total").value = `${totals.total.toFixed(2)} €`;
  document.getElementById("order-coupon").value = totals.coupon || "kein Code";
  document.getElementById("order-shipping").value = `${totals.shipping.label} – ${totals.shippingCost.toFixed(2)} €`;
  document.getElementById("order-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeOrderModal() {
  document.getElementById("order-modal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function submitOrderEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById("order-submit-btn");
  const status = document.getElementById("order-status");
  const originalText = button.textContent;
  const totals = calculateCart();

  document.getElementById("order-details").value = buildOrderText();
  document.getElementById("order-total").value = `${totals.total.toFixed(2)} €`;
  document.getElementById("order-coupon").value = totals.coupon || "kein Code";
  document.getElementById("order-shipping").value = `${totals.shipping.label} – ${totals.shippingCost.toFixed(2)} €`;

  button.disabled = true;
  button.textContent = "Wird gesendet …";
  status.textContent = "";
  status.className = "form-status";

  const params = {
    to_email: window.NekoMail?.getConfig().shopEmail || "",
    first_name: document.getElementById("order-firstname").value.trim(),
    last_name: document.getElementById("order-lastname").value.trim(),
    reply_to: document.getElementById("order-email").value.trim(),
    phone: document.getElementById("order-phone").value.trim(),
    street: document.getElementById("order-street").value.trim(),
    postal_code: document.getElementById("order-zip").value.trim(),
    city: document.getElementById("order-city").value.trim(),
    customer_message: document.getElementById("order-notes").value.trim(),
    order_details: buildOrderText(),
    order_total: `${totals.total.toFixed(2)} €`,
    coupon: totals.coupon || "kein Code",
    shipping: `${totals.shipping.label} – ${totals.shippingCost.toFixed(2)} €`,
    sent_at: new Date().toLocaleString("de-DE")
  };

  try {
    await window.NekoMail.sendOrder(params);
    localStorage.setItem("nekopaws_last_order", JSON.stringify({createdAt:new Date().toISOString(), cart, totals}));
    status.textContent = "Bestellanfrage wurde erfolgreich per E-Mail gesendet.";
    status.classList.add("success");
    cart = [];
    localStorage.removeItem(CART_KEY);
    renderCart();
    form.reset();
  } catch (error) {
    console.error(error);
    status.textContent = error?.message || "Bestellung konnte nicht gesendet werden.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

document.addEventListener("DOMContentLoaded",renderCart);
