"use strict";

(function () {
  function getConfig() {
    return window.EMAILJS_CONFIG || {};
  }

  function isConfigured() {
    const c = getConfig();
    return Boolean(
      c.publicKey && !c.publicKey.startsWith("DEINE_") &&
      c.serviceId && !c.serviceId.startsWith("DEINE_")
    );
  }

  function ensureReady(templateId) {
    if (!window.emailjs) {
      throw new Error("EmailJS konnte nicht geladen werden. Bitte Internetverbindung prüfen.");
    }
    if (!isConfigured()) {
      throw new Error("EmailJS ist noch nicht eingerichtet. Bitte js/email-config.js ausfüllen.");
    }
    if (!templateId || templateId.startsWith("DEINE_")) {
      throw new Error("Die passende EmailJS Template-ID fehlt in js/email-config.js.");
    }
  }

  function init() {
    const c = getConfig();
    if (!window.emailjs || !isConfigured()) return false;
    window.emailjs.init({ publicKey: c.publicKey });
    return true;
  }

  async function sendContact(params) {
    const c = getConfig();
    ensureReady(c.contactTemplateId);
    return window.emailjs.send(c.serviceId, c.contactTemplateId, params);
  }

  async function sendOrder(params) {
    const c = getConfig();
    ensureReady(c.orderTemplateId);
    return window.emailjs.send(c.serviceId, c.orderTemplateId, params);
  }

  window.NekoMail = { init, isConfigured, sendContact, sendOrder, getConfig };
  document.addEventListener("DOMContentLoaded", init);
})();
