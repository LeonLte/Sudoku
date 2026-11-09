# Sudoku

Eine eigene Sudoku-App fürs iPhone, als Web-App für den Home-Bildschirm. Läuft ohne App Store, ohne Mac und auch offline.

## Auf dem iPhone installieren
1. Den Link der App in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben).
3. **„Zum Home-Bildschirm“** wählen.

Danach startet die App wie eine normale App im Vollbild. Spielstand und Statistiken bleiben auf dem Handy gespeichert.

## Funktionen
- Drei Schwierigkeitsgrade: **leicht**, **mittel**, **schwer**. Jedes Rätsel hat genau eine Lösung.
- **3 Fehler** erlaubt, beim dritten ist das Spiel vorbei („Nochmal versuchen“ startet dasselbe Rätsel neu).
- **Hinweise**, wenn man nicht weiterkommt (füllt das gewählte oder das naheliegendste Feld).
- **Highlighting**: Tippt man auf eine Zahl, leuchten alle gleichen Zahlen auf. Schraffierte Felder zeigen, wo diese Zahl schon blockiert ist. Weiße leere Felder sind die, wo sie noch hin kann.
- Tippt man unten auf eine Zahl, ohne ein leeres Feld gewählt zu haben, wird diese Zahl überall hervorgehoben.
- **Notizen** (kleine Bleistiftzahlen), werden automatisch entfernt, wenn eine Zahl gesetzt wird.
- Timer mit **Pause** (pausiert auch automatisch beim Verlassen der App).
- **Statistiken** pro Schwierigkeitsgrad: gespielt, gewonnen, Gewinnquote, perfekte Spiele, Bestzeit, Ø Zeit, aktuelle und längste Siegesserie, Ø Fehler, genutzte Hinweise.
- Hell- und Dunkelmodus folgen der iPhone-Einstellung.

Wer ein laufendes Spiel abbricht, um ein neues zu starten, bekommt es als verloren gewertet (nach Rückfrage).

## Aufbau
| Datei | Inhalt |
|---|---|
| `index.html`, `styles.css` | Seite und Design |
| `src/app.js` | Bedienung: verbindet Spiellogik und Oberfläche |
| `src/storage.js` | Speichern auf dem Gerät (localStorage) |
| `src/logic/sudoku.js` | Löser, Generator, Schwierigkeitsbewertung |
| `src/logic/game.js` | Spielregeln: Eingabe, Fehler, Hinweise, Notizen, Highlighting, Timer |
| `src/logic/stats.js` | Statistiken |
| `src/logic/random.js` | Zufallsgenerator mit Seed |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Fähigkeit und App-Symbol |
| `test/` | Automatische Tests |

Kein Build-Schritt nötig, es ist reines HTML, CSS und JavaScript.

## Entwickeln
- Lokal starten: `python3 -m http.server 8000` und `http://localhost:8000` öffnen.
- Tests: `npm test` (Node.js 20+). Laufen auch automatisch auf GitHub bei jedem Push.
- Nach Änderungen in `sw.js` die `VERSION` erhöhen, damit die Handys die neue Version laden.

### Schwierigkeitsgrade
- **leicht**: 36–40 Vorgaben, lösbar nur mit „in dieses Feld passt nur eine Zahl“.
- **mittel**: 30–34 Vorgaben, braucht zusätzlich „diese Zahl passt nur noch an eine Stelle“.
- **schwer**: 23–28 Vorgaben, braucht fortgeschrittenere Techniken.
