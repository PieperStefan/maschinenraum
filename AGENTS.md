**Deutsch** · [English](AGENTS.en.md)

# AGENTS.md – Referenz für Menschen und KI-Assistenten

Diese Datei beschreibt vollständig, wie der Maschinenraum konfiguriert und erweitert wird. Eine KI soll mit ihr allein Bots einrichten, Räume bauen, Plugins schreiben und Bibliotheken erstellen können. Die Bedienoberfläche ist deutsch, daher sind auch Feldnamen deutsch.

## Grundregeln für KI-Assistenten

1. **Persönliches nur nach `privat/`.** Namen, Pfade, Hostnamen, IP-Adressen, Labels, Regeln und Links stehen in `privat/config.json`, `privat/plugins/`, `privat/raeume/` oder `privat/bibliothek/`. Diese Ordner sind durch `.gitignore` (Whitelist) ausgeschlossen. **Nie** Persönliches in `server.py`, `web/`, `raeume/`, `plugins/` oder `config.example.json` schreiben.
2. **Keine Geheimnisse in Konfigurationen.** Passwörter, Tokens und API-Schlüssel gehören in den macOS-Schlüsselbund. Ein Plugin liest sie zur Laufzeit, z. B. mit `security find-generic-password -s <dienst> -w`.
3. **Nur lesend beobachten.** Plugins und Bots lesen. Sie ändern keine fremden Daten und speichern keine sensiblen Zahlen in Dateien. Plugin-Ergebnisse werden bei jedem Aufruf live geholt und nicht gespeichert.
4. **Nach jeder Änderung prüfen:**
   - `python3 -m py_compile server.py privat/plugins/*.py`
   - JSON gültig halten: `python3 -m json.tool privat/config.json`
   - Server neu starten.
   - Im Browser die Konsole auf Fehler prüfen.
5. Python-Code muss mit dem **System-Python 3.9** laufen: kein `match`, keine Zusatzpakete. Falle: `datetime.fromisoformat` liest keine Zeitstempel mit 4–5 Nachkommastellen, wie Postgres sie liefert. Alter und Zeiten deshalb lieber in SQL berechnen.

## Dateien und Ablauf

| Datei | Aufgabe |
|---|---|
| `server.py` | Sammelt alle 60 s den Zustand der LaunchAgents in `daten/status.json` und liefert Seite und API aus. Lauscht nur auf `127.0.0.1`. |
| `web/app.js` | Bots, Live-Status, Bedienfeld, Sekretariat/Arzt, Mutter, Kamera |
| `web/welt.js` | Baut die Welt aus Räumen und Bibliothek, Wegfindungsraster (A*, 0,5 m) |
| `web/bibliothek/standard.js` | Aussehen: Materialien, Umgebung, Böden, Wände, Figur, alle Teile |
| `raeume/*.json` | Raum-Vorlagen. Gleichnamige Dateien in `privat/raeume/` haben Vorrang. |
| `plugins/*.py`, `privat/plugins/*.py` | Zusätzliche Datenquellen für Bots |
| `daten/` | `status.json`, `faelle.json`, `auftraege.json`, `behandlungen.log` (Laufzeit) |

Demo-Modus: `MR_DEMO=1` liefert erfundene Beispieldaten, sammelt nichts und führt nichts aus (für Tests und Bildschirmfotos).

Konfiguration: `$MR_CONFIG`, sonst `privat/config.json`, sonst `config.example.json`. Port: `$MR_PORT`, sonst `"port"` (Standard 8790).

### HTTP-API (alles relativ zur Seite)

| Methode | Pfad | Antwort |
|---|---|---|
| GET | `/api/config` | Seiten-Konfiguration (Räume aufgelöst, ohne Protokoll-Pfade) |
| GET | `/api/status` | `{erzeugt, system:{zeilen,status}, sicherungen[], cron[], gruppen[], jobs[]}` |
| GET | `/api/plugin?name=<quelle>` | Plugin-Ergebnis, live |
| GET | `/api/protokoll?bot=<id>` | letzter Lauf aus der Protokolldatei des Bots |
| GET | `/api/log?label=<label>` | Zustand, Protokoll-Ende und Diagnose eines LaunchAgents |
| GET | `/api/faelle`, `/api/auftraege` | Fälle (Sekretariat/Arzt), Aufträge (Mutter) |
| POST* | `/api/aktion` `{label, aktion}` | `aktion`: starten · stoppen · pausieren · deaktivieren · aktivieren · freigabe |
| POST* | `/api/mutter` `{nachricht, neu}` | Antwort von Claude (nur lesend) |
| POST* | `/api/auftraege` `{text}` oder `{id, status}` | Auftragsliste |
| POST* | `/api/fall` `{was:"sekretariat", bot, botid, labels}` oder `{was:"arzt", id, vorschlag}` | Fall anlegen bzw. Behandlung starten |

\* POST nur mit der Kopfzeile `X-Maschinenraum: 1`.

Ein **Job** in `status.json` sieht so aus: `{label, gruppe, status: ok|run|err|off, code, laeuft, geladen, deaktiviert, dauer, plan, rhythmus, zuletzt, naechst}`.

## Konfiguration (`privat/config.json`)

```jsonc
{
  "titel": "Maschinenraum · Mein Mac",   // Überschrift oben links
  "rechner": "Mein Mac",                  // Name des Rechners in Texten
  "benutzer": "Alex",                     // Anrede in Texten („Alex (kann Claude nicht)“)
  "port": 8790,
  "eigenes_label": "local.maschinenraum", // Label des eigenen Dienstes – darf nicht über die Seite gesteuert werden
  "check_titel": "SYSTEM-CHECK",          // Überschrift der Systemtafel
  "prefixe": ["com.example."],            // nur diese LaunchAgents zeigen/bedienen; [] = alle außer com.apple.*
  "gruppen": [{"name": "Sicherungen", "muster": "backup|sicherung"}],   // Regex auf das Label, erste passende gewinnt, sonst „Sonstige“
  "sicherungen": [{"name": "Nacht-Sicherung", "label": "com.example.backup"}], // Reihenfolge = Reihenfolge auf Tafel und Regal (max. 8 im Regal)
  "laufwerke": [{"name": "Externe SSD", "pfad": "/Volumes/SSD"}],       // zusätzliche Zeilen im System-Check
  "cron_json": {"datei": "~/pfad/jobs.json", "name": "Cron", "sicherungs_muster": "backup"}, // optional, Format {"jobs":[{name,enabled,last_status,last_run_at,next_run_at,schedule:{expr}}]}
  "exit_codes": {"75": "Laufwerk fehlte beim Start."},                  // eigene Klartexte für Exit-Codes
  "claude": "~/.local/bin/claude",        // Claude-Code-CLI (für Mutter, Sekretariat, Arzt)
  "regeln": "…",                          // optional: verbindliche Regeln für Sekretariat und Arzt (ersetzt die Standardregeln)
  "mutter_prompt": "…",                   // optional: Systemprompt der Mutter
  "portal": {"name": "Mein Portal", "untertitel": "Alle Dienste", "url": "http://{host}:8080/",
             "urls": [{"wenn_host_endet": ".example.net", "url": "https://portal.example.net/"}]}, // Prospekt auf dem Frühstückstisch; {host} = aktueller Hostname
  "welt": { "bibliothek": "standard", "raeume": [ … ] },               // siehe „Räume“
  "agenten": [ … ]                                                      // siehe „Bots“
}
```

## Bots (`agenten`)

```jsonc
{
  "id": "post",                    // eindeutig, nur Buchstaben/Ziffern; Fälle hängen an der id
  "name": "Mail-Abruf",            // Anzeigename
  "platz": "tisch2",               // id eines Schreibtischs · "bett" (Schlafkapsel) · weglassen = läuft frei herum
  "start": [3, -7],                // Startpunkt (Welt-x, Welt-z) für frei laufende Bots; ohne Angabe zufällig
  "arbeit": "post",                // Animation bei neuem Lauf: sicherung · konten · post · pruefen · weglassen
  "texte": {"post": ["Ruft Mails ab …", "Mails abgerufen ✓"]},          // optional: Sprechblasen der Animation
  "quelle": { "art": "aufgaben", "labels": ["com.example.mail-abruf"] }, // woraus der Status kommt, siehe unten
  "labels": ["com.example.zusatz"],// optional: weitere LaunchAgents, die im Bedienfeld erscheinen
  "plugin": "name",                // optional: zusätzlicher Plugin-Abschnitt im Bedienfeld (Status fließt mit ein)
  "protokoll": "pfad/zum/bot.log", // optional: Protokolldatei (relativ zum Projektordner oder absolut); zeigt den Zettel „📄 Protokoll“
  "protokoll_lauf": " Lauf ",      // optional: Text, an dem ein neuer Lauf im Protokoll beginnt; „Ergebnis: …“ wird ausgewertet
  "farbe": "#1a56db",              // optional: fester Körper; dann zeigt nur der KOPF den Status
  "info": "Erklärtext im Bedienfeld"
}
```

**`quelle.art`**

| art | Felder | Status | Text |
|---|---|---|---|
| `aufgaben` | `labels: [...]` | schlimmster Status der Jobs, alle aus → grau | Fehler mit Code, sonst „ok · zuletzt …“ |
| `gruppe` | `gruppe: "Name"` | wie `aufgaben`, über alle Jobs der Gruppe | |
| `sicherungen` | – | über die Liste `sicherungen` | nächste Sicherung; startet die Sicherungs-Animation bei jedem neuen Lauf |
| `system` | – | System-Check (CPU, RAM, Platten, Dienste, Netz) | auffällige Zeilen; Bedienfeld zeigt alle fehlerhaften Jobs |
| `plugin` | `name: "<quelle>"` | aus dem Plugin | aus dem Plugin |
| `fest` | `status`, `text` | fest | fest (für pausierte oder externe Dienste) |

Farben: `ok` grün, `run` gelb, `err` rot (blinkt), `off` grau. Rangfolge beim Zusammenfassen: err > run > ok > off.

**Animationen (`arbeit`)** brauchen benannte Punkte (`teil: "punkt"`) in den Räumen. Fehlt ein Punkt, wird der Schritt übersprungen.

| arbeit | Punkte (Reihenfolge) |
|---|---|
| `sicherung` | `band` → `pruefstation` → `tresor` → `tafel` → zurück an den Tisch (Frühstück) |
| `konten` | `bank` → `regal` |
| `post` | `post` (bei Fehler: Kopfkratzen, rote Lampe `lampe art:"post"`) |
| `pruefen` | `regal` → `anzeige` |

Freie und ruhende Bots machen Pausen an allen Punkten mit `pause`-Text und am Frühstückstisch.

## Räume (`welt.raeume`)

Ein Eintrag ist entweder eine Vorlage mit Position oder ein vollständiger Raum. Felder aus dem Eintrag überschreiben die Vorlage.

```jsonc
{"vorlage": "buero", "mitte": [0, -10]}
```

**Koordinaten:** Meter. `x` nach rechts, `z` zum Betrachter (vorne = +z), `y` nach oben. Winkel (`drehung`, `blick`) in **Grad**: 0 = Blick nach +z, 90 = Blick nach +x, 180 = nach −z, −90 = nach −x. Teile stehen in **Raum-Koordinaten** (0,0 = Raummitte).

```jsonc
{
  "id": "buero", "name": "Büro",
  "knopf": "Büro",              // Beschriftung des Kamera-Knopfs; false = kein Knopf
  "mitte": [0, -10], "groesse": [20, 20],                 // [x, z] und [Breite x, Tiefe z]
  "boden": "fliesen",           // fliesen · gitter · "#rrggbb"
  "waende": {                   // Seiten: links (−x) · rechts (+x) · hinten (−z) · vorne (+z)
    "links":  {"art": "fenster", "pfeiler": true},
    "rechts": "niedrig",
    "hinten": {"art": "niedrig", "mittig": true, "dicke": 0.2, "luecken": [[1.8, 3.7]]},
    "vorne":  {"art": "tor", "mittig": true}
  },
  "kamera": {"ziel": [-2, 0, 0], "pos": [10, 12.5, 11]},  // Raum-Koordinaten [x, y, z]
  "teile": [ {"teil": "schreibtisch", "x": -5, "z": 6, "id": "tisch1"}, … ]
}
```

**Wandarten:** `voll` (volle Höhe 4,2 m; `paneele: true` = orange Energie-Paneele) · `fenster` (Glas mit Brüstung) · `niedrig` (1,1 m mit Leuchtleiste) · `tor` (volle Wand mit 6-m-Tor, `torbreite`) · `offen`. Weitere Optionen: `pfeiler` (Stützen alle ~5 m), `mittig` (Wand auf der Raumkante statt außen), `dicke`, `luecken` (Durchgänge `[von, bis]` in Raum-Koordinaten entlang der Wand: x für vorne/hinten, z für links/rechts). Zwei Räume teilen sich eine Kante: die Wand nur bei **einem** der beiden Räume eintragen. Außerhalb aller Räume können Bots nicht laufen.

**Die Gesamtansicht** wird automatisch aus allen Räumen berechnet. Sie steht als vierter Knopf in der Leiste.

### Teile der Bibliothek `standard`

Alle Teile haben `x`, `z` und optional `drehung`. Was ein Teil zusätzlich „liefert“, nutzen die Bots.

| teil | Optionen | liefert |
|---|---|---|
| `schreibtisch` | `id` (z. B. tisch1), `teppich` (#rgb), `bildschirm` (hud0·hud1·hud2·code) | Sitzplatz für `platz: "<id>"` |
| `stuhl` | – | – |
| `wartestuhl` | – | Wartesitz im Sekretariat |
| `pflanze` | `groesse` (Faktor) | – |
| `whiteboard`, `buecherregal`, `wasserspender`, `drucker`, `schrank`, `aktenschrank`, `kaffeebar`, `sofa`, `besprechungstisch` | – | – |
| `schlafkapsel` | – | Bett für `platz: "bett"` |
| `fruehstueckstisch` | – | 3 Pausen-Sitze |
| `prospekt` | `y` (Tischhöhe 0.775) | Klick öffnet `portal` aus der Konfiguration |
| `anzeige` | `inhalt` (system · aufgaben · sicherungen · faelle), `breite`, `hoehe`, `y` | Live-Wandtafel; `faelle` öffnet beim Klick das Sekretariat |
| `bodenschild` | `text`, `farbe` (CSS-Farbe) | – |
| `reaktor` | – | Animation |
| `konsole` | `bildschirm` | – |
| `lampe` | `art` (pruefen · post), `y` | Signal für die Animationen |
| `sicherungsregal` | – | 8 Leuchtetiketten = erste 8 Sicherungen |
| `bandregal` | `anzahl` | – |
| `tresor` | – | Tür öffnet sich bei der Sicherungs-Animation |
| `mutter` | – | Klick öffnet das Gespräch mit Claude |
| `tresen` | – | – |
| `liege` | – | Behandlungsliege für den Arzt |
| `ekg`, `medizinschrank` | – | – |
| `personal` | `name`, `farbe`, `knopf` ("faelle" = Schild „Fälle & Vorschläge ansehen“) | feste Figur ohne Aufgabe |
| `punkt` | `name`, `pause` (Sprechblase bei Pausen) | Laufziel für Animationen und Pausen; unsichtbar |

Benötigte Punkte für alle Animationen: `band`, `pruefstation`, `tresor`, `tafel`, `bank`, `post`, `regal`, `anzeige`. Sekretariat und Arzt brauchen mindestens einen `wartestuhl` und eine `liege`.

## Bibliotheken (Aussehen austauschen)

`"welt": {"bibliothek": "meine"}` lädt `web/bibliothek/meine.js` (oder `privat/bibliothek/meine.js`). Eine Bibliothek ist ein ES-Modul und darf jede dieser Exporte liefern. **Fehlendes kommt automatisch aus `standard`.** Eine neue Bibliothek kann also mit einem einzigen anderen Schreibtisch anfangen.

```js
export function materialien(k) { return {M, T, bild} }  // M: Materialien, T: Texturen (T.hud[0..2], T.code, …), bild(name) → Textur
export function umgebung(k, b) {}                        // Himmel, Licht, Schatten; b = {x0,x1,zv,zh,w,d,cx,cz}
export function boden(k, raum) {}                        // raum = {cx,cz,w,d,x0,x1,zv,zh,boden,…}
export function wand(k, g, w) {}                         // g: Gruppe, lokal x entlang der Wand, +z zeigt in den Raum; w = {art, laenge, luecken:[[a,b]] (0…laenge), …}
export function figur(k, farbe) { return {root, body, head, headBall, arms:[l,r], legs:[l,r], mat, tipMat, carry, items:{band, ordner, tasse}} }
export const teile = { schreibtisch(k, o) { … return {sitz} } }
```

**Werkzeugkasten `k`:**
- `THREE`, `scene`, `CSS2DObject`, `WH` (Wandhöhe), `rnd()` (fester Zufall)
- `ctex(w, h, zeichne, rx, ry)` erzeugt eine Canvas-Textur.
- `std(opts)` erzeugt ein MeshStandardMaterial.
- `mesh(geo, mat, x, y, z, parent, schatten)`, `box(w, h, d, mat, x, y, z, parent)`, `cyl(rt, rb, h, mat, x, y, z, parent)`
- `gruppe(o)` liefert eine Gruppe an o.x/o.z mit Drehung o.ry.
- `punkt(g, lx, lz, lry)` rechnet einen lokalen Punkt in die Welt um: {x, z, ry}.
- `sperre(g, lx0, lz0, lx1, lz1, rand)` sperrt eine Fläche für die Wegfindung.
- `anzeigeTextur(inhalt, w, h)`, `figur(farbe)`, `cfg` (Seiten-Konfiguration), `aktion('mutter'|'sekretariat')`, `portalUrl()`
- Nach `materialien()` zusätzlich `M`, `T`, `bild`.

**Ein Teil** bekommt `(k, o)`: `o` ist der Eintrag aus der Raum-Datei mit `o.x`/`o.z` in Weltkoordinaten und `o.ry` in Bogenmaß. Es gibt ein Objekt zurück mit beliebigen dieser Felder:
- `sitz:{x,z,ry}` – Sitzplatz
- `bett:{x,y,z,ry,ap:{x,z}}` und `liege:{…}` – `ap` ist der Zugangspunkt
- `wartesitz:{x,z,ry}`
- `tischsitze:[…]`
- `anzeige:{inhalt, tex}` bzw. `{inhalt:"regal", etiketten:[tex…]}`
- `tick(t, fx)` – wird jedes Bild aufgerufen; `fx` = {tresorT, pruefen, postFehler, mutterDenkt}

Klickbare Objekte setzen `obj.userData.klick = {art:'mutter'|'sekretariat'|'link', url}`.

## Plugins (eigene Datenquellen)

Eine Python-Datei in `privat/plugins/` (privat) oder `plugins/` (allgemein) mit einem Wörterbuch `QUELLEN`:

```python
def meine_quelle(kern):
    # kern = {"zustand": fn(label) -> {geladen,pid,code}, "iso": fn(ts), "schwaerzen": fn(text), "pfad": fn(p), "cfg": dict}
    return {
        "status": "ok",                     # ok · run · err · off
        "text": "läuft · zuletzt vor 5 Min.",
        "naechst": None, "zuletzt": None,   # optional ISO-Zeit; ein neues „zuletzt“ startet die Animation
        "abschnitte": [{"titel": "Details", "text": "Zusammenfassung",
                        "zeilen": [{"status": "ok", "titel": "Quelle A", "text": "zuletzt 10:00", "fehler": None}],
                        "hinweis": "kleiner Text darunter"}],
        "links": [{"text": "📄 Öffnen", "url": "https://…"}],
    }

QUELLEN = {"meine_quelle": meine_quelle}
```

Benutzt wird das Plugin in einem Bot mit `"quelle": {"art": "plugin", "name": "meine_quelle"}` oder als Zusatz mit `"plugin": "meine_quelle"`. Die Seite ruft Plugins alle 30 s auf. Halte sie schnell (Zeitlimit für externe Aufrufe ≤ 15 s) und fange Fehler selbst ab. Ein Fehler wird sonst als roter Status angezeigt.

## Sekretariat, Arzt, Mutter (Claude Code)

- **Sekretariat:** Claude im Plan-Modus mit `Read`/`Grep`/`Glob` auf die Ordner der betroffenen Dienste (aus deren Plist). Liefert JSON `{diagnose, ursache, vorschlaege:[{titel, beschreibung, wer: claude|benutzer, risiko}]}`.
- **Arzt:** Claude mit `acceptEdits`, Bash nur für eine feste Liste (`launchctl kickstart/print/list`, `plutil`, `cp`, `ls`, `tail`, `head`, `cat`, `grep`, `sleep`, `py_compile`, `date`, `stat`). Gesperrt: `rm`, `sudo`, `launchctl bootout/disable`, `security`, Web. Regeln aus `regeln`. Ergebnis `{erfolg, bericht, benutzer}`. Protokoll in `daten/behandlungen.log`.
- **Mutter:** Claude im Plan-Modus, liest `daten/status.json`. Aufträge landen in `daten/auftraege.json`.

## Checkliste: neuen Bot einrichten

1. Label des LaunchAgents herausfinden: `launchctl list | grep <name>`.
2. Prüfen, ob das Label zu `prefixe` passt.
3. Bot in `privat/config.json` unter `agenten` eintragen: `id`, `name`, `quelle`, und `platz` oder `start`.
4. Optional: `arbeit` (Animation), `protokoll`, `farbe`, `info`.
5. JSON prüfen, Server neu starten (`launchctl kickstart -k gui/$(id -u)/<eigenes_label>` oder `./start.sh`) und Seite neu laden.
