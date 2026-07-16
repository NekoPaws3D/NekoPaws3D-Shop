# NekoPaws3D – GitHub Pages + EmailJS

Dieses Projekt bleibt vollständig statisch und kann in PyCharm bearbeitet und anschließend auf GitHub Pages veröffentlicht werden. Das bestehende Design wurde nicht verändert.

## Lokal in PyCharm starten

1. Projektordner in PyCharm öffnen.
2. `index.html` rechtsklicken.
3. **Open in Browser** wählen.
4. Für den echten E-Mail-Test ist eine Internetverbindung nötig, weil der EmailJS-Browser-SDK über ein CDN geladen wird.

## EmailJS einmalig einrichten

1. Bei EmailJS anmelden.
2. Unter **Email Services** deine bereits vorhandene E-Mail-Adresse bzw. deinen Mailanbieter verbinden.
3. Zwei Templates erstellen:
   - Kontaktformular
   - Bestellanfrage
4. Unter **Account** den Public Key kopieren.
5. In `js/email-config.js` eintragen:

```js
window.EMAILJS_CONFIG = {
  publicKey: "DEINE_PUBLIC_KEY",
  serviceId: "DEINE_SERVICE_ID",
  contactTemplateId: "DEINE_KONTAKT_TEMPLATE_ID",
  orderTemplateId: "DEINE_BESTELL_TEMPLATE_ID",
  shopEmail: "deine-adresse@example.de"
};
```

Es wird **kein Private Key** und kein Passwort in GitHub gespeichert.

## Variablen für das Kontakt-Template

Diese Variablen stehen zur Verfügung:

- `{{to_email}}`
- `{{from_name}}`
- `{{reply_to}}`
- `{{phone}}`
- `{{subject}}`
- `{{message}}`
- `{{sent_at}}`

Empfohlene Einstellungen im Template:

- **To Email:** deine Shop-Adresse oder `{{to_email}}`
- **Reply To:** `{{reply_to}}`
- **Subject:** `Kontakt: {{subject}}`

## Variablen für das Bestell-Template

- `{{to_email}}`
- `{{first_name}}`
- `{{last_name}}`
- `{{reply_to}}`
- `{{phone}}`
- `{{street}}`
- `{{postal_code}}`
- `{{city}}`
- `{{customer_message}}`
- `{{order_details}}`
- `{{order_total}}`
- `{{coupon}}`
- `{{shipping}}`
- `{{sent_at}}`

Empfohlene Einstellungen:

- **To Email:** deine Shop-Adresse oder `{{to_email}}`
- **Reply To:** `{{reply_to}}`
- **Subject:** `Neue Bestellung von {{first_name}} {{last_name}}`

## GitHub Pages

1. Sämtliche Dateien in ein GitHub-Repository hochladen.
2. `index.html` muss im Hauptverzeichnis liegen.
3. In GitHub: **Settings → Pages**.
4. **Deploy from a branch**, Branch `main`, Ordner `/ (root)` auswählen.
5. Speichern.

## EmailJS-Sicherheit

Der Public Key darf laut EmailJS für den Browser verwendet werden. Aktiviere im EmailJS-Dashboard zusätzlich die Domain-Allowlist und trage deine GitHub-Pages-Domain sowie für lokale Tests `http://localhost:63342` ein.

## Shop-Funktionen

- Produktgalerien mit mehreren Bildern
- Warenkorb mit Mengensteuerung und Löschen
- Gutscheincodes aus `js/products.js`
- Hermes- und DHL-Versand
- FSK-18-Bestätigung
- Kontaktformular per EmailJS
- Bestellanfragen per EmailJS
- Gästebuch über `localStorage`

Hinweis: Gästebucheinträge sind ohne Backend nur im jeweiligen Browser sichtbar.

## Adminbereich für Produkte und Preise

Öffne lokal in PyCharm die Datei:

`admin.html`

Standardpasswort:

`NekoPaws3D-Admin`

Das Passwort kannst du oben in `js/admin.js` bei `ADMIN_PASSWORD` ändern.

### Wichtig bei GitHub Pages
GitHub Pages ist statisch und besitzt keine Datenbank. Deshalb kann ein öffentlich aufgerufener Adminbereich die Dateien im GitHub-Repository nicht sicher direkt überschreiben. Der eingebaute Adminbereich ist für den Betreiber-Workflow gedacht:

1. Produkte und Preise in `admin.html` bearbeiten.
2. `products.js herunterladen` anklicken.
3. Die heruntergeladene Datei in PyCharm als `js/products.js` einsetzen.
4. Neue Bilder nach `assets/products/` kopieren.
5. Änderungen zu GitHub pushen/hochladen.

Damit bleiben keine GitHub-Zugangsdaten oder geheimen Tokens im Browser-Code.
