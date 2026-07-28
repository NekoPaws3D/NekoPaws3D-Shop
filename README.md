# NekoPaws3D – GitHub Pages mit Website-Admin

## Im Adminbereich möglich
- Produkte hinzufügen, duplizieren und löschen
- Produktname, Beschreibung, Kategorie, Preis, Bestand, SKU und Sortierung ändern
- Produkt sichtbar/unsichtbar schalten
- Personalisierbar und hervorgehoben einstellen
- mehrere Produktbilder direkt hochladen und entfernen
- Gutscheincodes als Prozent, Eurobetrag oder Gratisversand verwalten
- Hermes- und DHL-Kosten sowie Freigrenzen ändern
- Shoptexte und Weiterleitungs-E-Mail ändern
- alle Änderungen mit einem Klick veröffentlichen

## PyCharm
Das Projekt kann weiterhin in PyCharm bearbeitet werden. Zum lokalen Testen `index.html` über **Open in Browser** starten. Da `data/store.json` per `fetch()` geladen wird, nicht per Doppelklick als `file://` öffnen.

## Hinweis zu Bestellungen
Der statische Shop sendet Bestellanfragen per EmailJS. Er speichert keine Bestellungen zentral in einer Datenbank. Für eine echte Bestellverwaltung mit Zahlungsstatus wäre später ein Datenbankdienst erforderlich.
