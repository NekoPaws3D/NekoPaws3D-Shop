"use strict";

let publicGuestbookEntries = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function stars(value) {
  const rating = Math.max(1, Math.min(5, Number(value) || 5));
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function renderGuestbook() {
  const box = document.getElementById("guestbook-list");
  if (!box) return;

  const entries = publicGuestbookEntries
    .filter(entry => entry.visible !== false)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!entries.length) {
    box.innerHTML = '<p class="muted">Noch keine veröffentlichten Einträge vorhanden.</p>';
    return;
  }

  box.innerHTML = entries.map(entry => `
    <article class="guest-entry">
      <div class="guest-entry-head">
        <b>${escapeHtml(entry.name || "Gast")}</b>
        <span class="guest-stars" aria-label="${Number(entry.rating) || 5} von 5 Sternen">${stars(entry.rating)}</span>
      </div>
      <small>${escapeHtml(entry.date || "")}</small>
      <p>${escapeHtml(entry.message || "").replace(/\n/g, "<br>")}</p>
    </article>
  `).join("");
}

function loadGuestbookFromStore(event) {
  const data = event?.detail || {};
  publicGuestbookEntries = Array.isArray(data.guestbookEntries) ? data.guestbookEntries : [];
  renderGuestbook();
}

async function submitGuestEntry(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById("guest-status");
  const originalText = button.textContent;

  const name = document.getElementById("guest-name").value.trim();
  const email = document.getElementById("guest-email").value.trim();
  const rating = document.getElementById("guest-rating").value;
  const message = document.getElementById("guest-message").value.trim();

  button.disabled = true;
  button.textContent = "Wird gesendet …";
  status.textContent = "";
  status.className = "form-status";

  const params = {
    to_email: window.NekoMail?.getConfig().shopEmail || "",
    from_name: name,
    reply_to: email,
    phone: "",
    subject: `Neuer Gästebucheintrag von ${name}`,
    message:
`NEUER GÄSTEBUCHEINTRAG – BITTE PRÜFEN

Name: ${name}
E-Mail: ${email}
Bewertung: ${rating} von 5 Sternen
Datum: ${new Date().toLocaleString("de-DE")}

Nachricht:
${message}

Zum Veröffentlichen:
Adminbereich öffnen → Gästebuch → Neuer Eintrag → Daten übernehmen → Alles veröffentlichen.`,
    sent_at: new Date().toLocaleString("de-DE")
  };

  try {
    await window.NekoMail.sendContact(params);
    form.reset();
    document.getElementById("guest-rating").value = "5";
    status.textContent = "Vielen Dank! Dein Eintrag wurde zur Prüfung gesendet und erscheint nach der Freigabe.";
    status.classList.add("success");
  } catch (error) {
    console.error(error);
    status.textContent = error?.message || "Der Eintrag konnte nicht gesendet werden.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

window.addEventListener("neko-store-ready", loadGuestbookFromStore);
document.addEventListener("DOMContentLoaded", () => {
  if (window.NEKO_STORE_READY) renderGuestbook();
});
