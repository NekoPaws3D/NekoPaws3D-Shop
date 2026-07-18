"use strict";

function prefillProductInquiry() {
  const productId = Number(new URLSearchParams(window.location.search).get("product"));
  if (!productId || !Array.isArray(window.products)) return;

  const product = window.products.find(item => Number(item.id) === productId);
  if (!product) return;

  const subject = document.getElementById("contact-subject");
  const message = document.getElementById("contact-message");
  const intro = document.getElementById("contact-intro");

  if (intro) {
    intro.textContent = `Du möchtest „${product.name}“ bestellen. Teile uns bitte Menge, Ausführung und deine Wünsche mit. Wir melden uns mit einem persönlichen Angebot.`;
  }
  if (subject) subject.value = `Bestellanfrage: ${product.name}`;
  if (message) {
    message.value = `Hallo NekoPaws3D,

ich interessiere mich für folgenden Artikel:

Artikel: ${product.name}
Artikelnummer: ${product.sku || "nicht angegeben"}
Gewünschte Menge:
Gewünschte Ausführung/Farbe:
Personalisierungswunsch:
Weitere Hinweise:

Bitte sendet mir ein Angebot.

Viele Grüße`;
  }
}

function initProductInquiry() {
  if (window.NEKO_STORE_READY) prefillProductInquiry();
  else window.addEventListener("neko-store-ready", prefillProductInquiry, { once: true });
}

document.addEventListener("DOMContentLoaded", initProductInquiry);

async function submitContactForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById("contact-status");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "Wird gesendet …";
  status.textContent = "";
  status.className = "form-status";

  const params = {
    to_email: window.NekoMail?.getConfig().shopEmail || "",
    from_name: document.getElementById("contact-name").value.trim(),
    reply_to: document.getElementById("contact-email").value.trim(),
    phone: document.getElementById("contact-phone").value.trim(),
    subject: document.getElementById("contact-subject").value.trim(),
    message: document.getElementById("contact-message").value.trim(),
    sent_at: new Date().toLocaleString("de-DE")
  };

  try {
    await window.NekoMail.sendContact(params);
    form.reset();
    status.textContent = "Nachricht wurde erfolgreich gesendet.";
    status.classList.add("success");
  } catch (error) {
    console.error(error);
    status.textContent = error?.message || "Nachricht konnte nicht gesendet werden.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}
