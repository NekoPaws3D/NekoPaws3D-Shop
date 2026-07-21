"use strict";

(function () {
  const form = document.getElementById("commission-form");
  const files = document.getElementById("reference-images");
  const names = document.getElementById("reference-file-names");
  const status = document.getElementById("commission-status");
  const button = document.getElementById("commission-submit");

  files?.addEventListener("change", () => {
    names.value = [...files.files].map(file => file.name).join(", ");
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Anfrage wird gesendet …";
    status.textContent = "";
    status.className = "form-status";

    try {
      const config = window.EMAILJS_CONFIG;

      if (!config || !window.emailjs) {
        throw new Error("EmailJS-Konfiguration konnte nicht geladen werden.");
      }

      if (!config.serviceId || !config.contactTemplateId || !config.publicKey) {
        throw new Error("serviceId, contactTemplateId oder publicKey fehlt in js/email-config.js.");
      }

      emailjs.init({ publicKey: config.publicKey });

      const formData = new FormData(form);
      const fullName = `${formData.get("first_name") || ""} ${formData.get("last_name") || ""}`.trim();

      const message = [
        "ART DER ANFRAGE: ZEICHENAUFTRAG",
        "",
        `Name: ${fullName}`,
        `E-Mail: ${formData.get("reply_to") || ""}`,
        `Zeichenstil: ${formData.get("drawing_style") || ""}`,
        `Anzahl Figuren: ${formData.get("character_count") || ""}`,
        `Hintergrund: ${formData.get("background") || ""}`,
        `Nutzung: ${formData.get("usage_rights") || ""}`,
        `Dateiformat: ${formData.get("file_format") || ""}`,
        `Budget: ${formData.get("budget") || "nicht angegeben"} €`,
        `Wunschtermin: ${formData.get("desired_date") || "nicht angegeben"}`,
        `Referenzdateien: ${formData.get("reference_file_names") || "keine"}`,
        "",
        "Motivbeschreibung:",
        formData.get("motif_description") || "",
        "",
        "Zusätzliche Wünsche:",
        formData.get("extra_wishes") || "keine"
      ].join("\n");

      const templateParams = {
        from_name: fullName,
        name: fullName,
        reply_to: formData.get("reply_to") || "",
        email: formData.get("reply_to") || "",
        subject: "Neue Zeichenauftrag-Anfrage",
        request_type: "Zeichenauftrag",
        message,
        customer_message: message,
        to_email: config.shopEmail || ""
      };

      await emailjs.send(
        config.serviceId,
        config.contactTemplateId,
        templateParams
      );

      status.textContent = "Deine Zeichenauftrag-Anfrage wurde erfolgreich gesendet.";
      status.className = "form-status success";
      form.reset();
      names.value = "";
    } catch (error) {
      console.error(error);
      status.textContent = `Senden fehlgeschlagen: ${error.message || error}`;
      status.className = "form-status error";
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
})();
