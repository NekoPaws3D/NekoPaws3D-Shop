NekoPaws3D Admin-Login-Fix

Ersetze im GitHub-Repository im Ordner admin/ diese drei Dateien:
- index.html
- admin.js
- admin.css

Danach GitHub Pages kurz aktualisieren lassen und öffnen:
https://nekopaws3d.github.io/NekoPaws3D-Shop/admin/?v=4

Der Fix:
- lädt admin.js mit Cache-Buster
- zeigt Lade- und Fehlermeldungen sichtbar an
- prüft den Token direkt über data/store.json
- unterstützt Anmeldung mit Enter
