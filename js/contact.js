"use strict";

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
