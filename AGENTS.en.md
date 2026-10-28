[Deutsch](AGENTS.md) · **English**

# AGENTS.en.md – reference for people and AI assistants

This file fully describes how to configure and extend the Maschinenraum (“engine room”). With it alone, an AI should be able to set up robots, build rooms, write plugins and create libraries.

**Language note:** the UI and all configuration **field names and values are German** (e.g. `agenten`, `quelle`, `art: "aufgaben"`). Keep them exactly as written. Only free texts (names, info texts, speech bubbles) can be in any language. Glossary: *Agent/Bot* robot · *Aufgabe* job (LaunchAgent) · *Raum* room · *Teil* part/furniture · *Bibliothek* library · *Sicherung* backup · *Sekretariat* secretariat · *Arzt* doctor · *Mutter* the mainframe chat · *Fall* case · *privat* private · *daten* data.

## Ground rules for AI assistants

1. **Personal data only in `privat/`.** Names, paths, hostnames, IP addresses, labels, rules and links belong in `privat/config.json`, `privat/plugins/`, `privat/raeume/` or `privat/bibliothek/`. These folders are excluded by `.gitignore` (whitelist). **Never** put anything personal into `server.py`, `web/`, `raeume/`, `plugins/` or `config.example.json`.
2. **No secrets in configuration files.** Passwords, tokens and API keys belong in the macOS keychain. A plugin reads them at runtime, e.g. with `security find-generic-password -s <service> -w`.
3. **Observe read-only.** Plugins and robots read. They do not change foreign data and do not store sensitive numbers in files. Plugin results are fetched live on every call and never stored.
4. **Check after every change:**
   - `python3 -m py_compile server.py privat/plugins/*.py`
   - Keep JSON valid: `python3 -m json.tool privat/config.json`
   - Restart the server.
   - Check the browser console for errors.
5. Python code must run on the **system Python 3.9**: no `match`, no extra packages. Pitfall: `datetime.fromisoformat` cannot read timestamps with 4–5 fractional digits as PostgreSQL returns them. Compute ages and times in SQL instead.

## Files and flow

| File | Purpose |
|---|---|
| `server.py` | Collects the state of all LaunchAgents every 60 s into `daten/status.json`, serves the page and the API. Listens on `127.0.0.1` only. |
| `web/app.js` | Robots, live status, control panel, secretariat/doctor, Mutter, camera |
| `web/welt.js` | Builds the world from rooms and library, path-finding grid (A*, 0.5 m) |
| `web/bibliothek/neon.js` | Default look (control room): materials, environment, floors, walls, robot figure, parts |
| `web/bibliothek/standard.js` | Previous spaceship office, load with `"bibliothek": "standard"` |
| `raeume/*.json` | Room templates. Files with the same name in `privat/raeume/` take precedence. |
| `plugins/*.py`, `privat/plugins/*.py` | Additional data sources for robots |
| `daten/` | `status.json`, `faelle.json`, `auftraege.json`, `behandlungen.log` (runtime) |

Demo mode: `MR_DEMO=1` serves made-up sample data, collects nothing and executes nothing (for tests and screenshots).

Configuration: `$MR_CONFIG`, otherwise `privat/config.json`, otherwise `config.example.json`. Port: `$MR_PORT`, otherwise `"port"` (default 8790).

### HTTP API (relative to the page)

| Method | Path | Response |
|---|---|---|
| GET | `/api/config` | page configuration (rooms resolved, without log paths) |
| GET | `/api/status` | `{erzeugt, system:{zeilen,status}, sicherungen[], cron[], gruppen[], jobs[]}` |
| GET | `/api/plugin?name=<source>` | plugin result, live |
| GET | `/api/protokoll?bot=<id>` | last run from the robot's log file |
| GET | `/api/log?label=<label>` | state, log tail and diagnosis of a LaunchAgent |
| GET | `/api/faelle`, `/api/auftraege` | cases (secretariat/doctor), tasks (Mutter) |
| POST* | `/api/aktion` `{label, aktion}` | `aktion`: starten (start) · stoppen (stop) · pausieren (pause) · deaktivieren (disable) · aktivieren (enable) · freigabe (open privacy settings) |
| POST* | `/api/mutter` `{nachricht, neu}` | answer from Claude (read-only) |
| POST* | `/api/auftraege` `{text}` or `{id, status}` | task list |
| POST* | `/api/fall` `{was:"sekretariat", bot, botid, labels}` or `{was:"arzt", id, vorschlag}` | open a case / start a treatment |

\* POST only with the header `X-Maschinenraum: 1`.

A **job** in `status.json` looks like this: `{label, gruppe, status: ok|run|err|off, code, laeuft, geladen, deaktiviert, dauer, plan, rhythmus, zuletzt, naechst}` (group, running, loaded, disabled, permanent, plan, schedule text, last run, next run).

## Configuration (`privat/config.json`)

```jsonc
{
  "titel": "Maschinenraum · My Mac",      // headline top left
  "rechner": "My Mac",                    // name of the computer in texts
  "benutzer": "Alex",                     // how the user is addressed („Alex (Claude can't)“)
  "port": 8790,
  "eigenes_label": "local.maschinenraum", // label of this service itself – cannot be controlled from the page
  "check_titel": "SYSTEM-CHECK",          // headline of the system board
  "prefixe": ["com.example."],            // only show/control these LaunchAgents; [] = all except com.apple.*
  "gruppen": [{"name": "Backups", "muster": "backup|sicherung"}],       // regex on the label, first match wins, otherwise „Sonstige“ (other)
  "sicherungen": [{"name": "Nightly backup", "label": "com.example.backup"}], // order = order on the board and shelf (max. 8 on the shelf)
  "laufwerke": [{"name": "External SSD", "pfad": "/Volumes/SSD"}],      // extra rows in the system check (drives)
  "cron_json": {"datei": "~/path/jobs.json", "name": "Cron", "sicherungs_muster": "backup"}, // optional, format {"jobs":[{name,enabled,last_status,last_run_at,next_run_at,schedule:{expr}}]}
  "exit_codes": {"75": "Drive was missing at start."},                  // your own plain texts for exit codes
  "claude": "~/.local/bin/claude",        // Claude Code CLI (for Mutter, secretariat, doctor)
  "regeln": "…",                          // optional: binding rules for secretariat and doctor (replaces the default rules)
  "mutter_prompt": "…",                   // optional: system prompt of Mutter
  "portal": {"name": "My Portal", "untertitel": "All services", "url": "http://{host}:8080/",
             "urls": [{"wenn_host_endet": ".example.net", "url": "https://portal.example.net/"}]}, // brochure on the breakfast table; {host} = current hostname; wenn_host_endet = “if host ends with”
  "welt": { "bibliothek": "neon", "raeume": [ … ] },                   // world: library + rooms, see “Rooms”; "standard" = spaceship office
  "agenten": [ … ]                                                      // robots, see “Robots”
}
```

## Robots (`agenten`)

```jsonc
{
  "id": "post",                    // unique, letters/digits only; cases are linked to the id
  "name": "Mail fetch",            // display name
  "platz": "tisch2",               // seat: id of a desk · "bett" (sleeping pod) · omit = walks around freely
  "start": [3, -7],                // start point (world x, world z) for free-walking robots; random if omitted
  "arbeit": "post",                // animation on a new run: sicherung · konten · post · pruefen · omit
  "texte": {"post": ["Fetching mail …", "Mail fetched ✓"]},             // optional: speech bubbles of the animation
  "quelle": { "art": "aufgaben", "labels": ["com.example.mail-fetch"] }, // where the status comes from, see below
  "labels": ["com.example.extra"], // optional: more LaunchAgents shown in the control panel
  "plugin": "name",                // optional: extra plugin section in the control panel (its status is included)
  "protokoll": "path/to/bot.log",  // optional: log file (relative to the project folder or absolute); shows the „📄 Protokoll“ note
  "protokoll_lauf": " Lauf ",      // optional: text that marks the start of a new run in the log; „Ergebnis: …“ is evaluated
  "farbe": "#1a56db",              // optional: fixed body color; then only the HEAD shows the status
  "info": "explanation shown in the control panel"
}
```

**`quelle.art`** (source type)

| art | fields | status | text |
|---|---|---|---|
| `aufgaben` (jobs) | `labels: [...]` | worst status of the jobs, all off → grey | errors with code, otherwise „ok · zuletzt …“ |
| `gruppe` (group) | `gruppe: "Name"` | like `aufgaben`, over all jobs of the group | |
| `sicherungen` (backups) | – | over the `sicherungen` list | next backup; starts the backup animation on every new run |
| `system` | – | system check (CPU, RAM, disks, services, network) | rows that need attention; the control panel lists all failing jobs |
| `plugin` | `name: "<source>"` | from the plugin | from the plugin |
| `fest` (fixed) | `status`, `text` | fixed | fixed (for paused or external services) |

Colors: `ok` green, `run` yellow, `err` red (blinking), `off` grey. Precedence when combining: err > run > ok > off. In `neon`, the chest lamp and antenna carry that color (the body stays white, or `farbe`). Without `statusMat`, the whole body takes the state color.

**Animations (`arbeit`)** need named points (`teil: "punkt"`) in the rooms. If a point is missing, that step is skipped.

| arbeit | points (in order) |
|---|---|
| `sicherung` (backup) | `band` (tape) → `pruefstation` (check station) → `tresor` (vault) → `tafel` (board) → back to the desk (breakfast) |
| `konten` (accounts) | `bank` → `regal` (shelf) |
| `post` (mail) | `post` (on error: head scratching, red lamp `lampe art:"post"`) |
| `pruefen` (review) | `regal` → `anzeige` (board) |

Free and idle robots take breaks at every point that has a `pause` text and at the breakfast table.

## Rooms (`welt.raeume`)

An entry is either a template with a position or a complete room. Fields in the entry override the template.

```jsonc
{"vorlage": "buero", "mitte": [0, -10]}   // vorlage = template, mitte = center
```

**Coordinates:** meters. `x` to the right, `z` towards the viewer (front = +z), `y` up. Angles (`drehung` = rotation) in **degrees**: 0 = facing +z, 90 = facing +x, 180 = facing −z, −90 = facing −x. Parts are placed in **room coordinates** (0,0 = room center).

```jsonc
{
  "id": "buero", "name": "Büro",
  "knopf": "Office",            // label of the camera button; false = no button
  "mitte": [0, -10], "groesse": [20, 20],                 // center [x, z] and size [width x, depth z]
  "boden": "fliesen",           // floor: fliesen (tiles) · gitter (grating) · "#rrggbb"
  "waende": {                   // walls. Sides: links (−x) · rechts (+x) · hinten (back, −z) · vorne (front, +z)
    "links":  {"art": "fenster", "pfeiler": true},
    "rechts": "niedrig",
    "hinten": {"art": "niedrig", "mittig": true, "dicke": 0.2, "luecken": [[1.8, 3.7]]},
    "vorne":  {"art": "tor", "mittig": true}
  },
  "kamera": {"ziel": [-2, 0, 0], "pos": [10, 12.5, 11]},  // camera target and position in room coordinates [x, y, z]
  "teile": [ {"teil": "schreibtisch", "x": -5, "z": 6, "id": "tisch1"}, … ]   // parts
}
```

**Wall types (`art`):** `voll` (full height 4.2 m; `paneele: true` = orange energy panels) · `fenster` (glass with parapet) · `niedrig` (low, 1.1 m with light strip) · `tor` (full wall with a 6 m gate, `torbreite`) · `offen` (open). More options: `pfeiler` (pillars about every 5 m), `mittig` (wall centered on the room edge instead of outside), `dicke` (thickness), `luecken` (openings `[from, to]` in room coordinates along the wall: x for front/back, z for left/right). When two rooms share an edge, define the wall in **one** of them only. Robots cannot walk outside of all rooms.

**The overview** (“Gesamt”) is computed automatically from all rooms. It appears as the fourth button in the bar.

### Parts of the `standard` library

All parts take `x`, `z` and optionally `drehung`. What a part additionally “provides” is used by the robots.

| teil | options | provides |
|---|---|---|
| `schreibtisch` (desk) | `id` (e.g. tisch1), `teppich` (rug #rgb), `bildschirm` (screen: hud0·hud1·hud2·code) | seat for `platz: "<id>"` |
| `stuhl` (chair) | – | – |
| `wartestuhl` (waiting chair) | – | waiting seat in the secretariat |
| `pflanze` (plant) | `groesse` (scale) | – |
| `whiteboard`, `buecherregal` (bookshelf), `wasserspender` (water cooler), `drucker` (printer), `schrank` (cupboard), `aktenschrank` (file cabinet), `kaffeebar` (coffee bar), `sofa`, `besprechungstisch` (meeting table) | – | – |
| `schlafkapsel` (sleeping pod) | – | bed for `platz: "bett"` |
| `fruehstueckstisch` (breakfast table) | – | 3 break seats |
| `prospekt` (brochure) | `y` (table height 0.775) | click opens `portal` from the configuration |
| `anzeige` (wall board) | `inhalt` (system · aufgaben · sicherungen · faelle), `breite`, `hoehe`, `y` | live board; `faelle` opens the secretariat on click |
| `bodenschild` (floor sign) | `text`, `farbe` (CSS color) | – |
| `reaktor` (reactor) | – | animation |
| `konsole` (console) | `bildschirm` | – |
| `lampe` (lamp) | `art` (pruefen · post), `y` | signal for the animations |
| `sicherungsregal` (backup shelf) | – | 8 glowing labels = first 8 backups |
| `bandregal` (tape rack) | `anzahl` (count) | – |
| `tresor` (vault) | – | door opens during the backup animation |
| `mutter` (mainframe) | – | click opens the chat with Claude |
| `tresen` (reception desk) | – | – |
| `liege` (treatment couch) | – | where robots lie while the doctor repairs them |
| `ekg`, `medizinschrank` (medicine cabinet) | – | – |
| `personal` (staff) | `name`, `farbe`, `knopf` ("faelle" = sign “view cases & suggestions”) | fixed figure without a job |
| `punkt` (point) | `name`, `pause` (speech bubble during breaks) | target for animations and breaks; invisible |

Points needed for all animations: `band`, `pruefstation`, `tresor`, `tafel`, `bank`, `post`, `regal`, `anzeige`. Secretariat and doctor need at least one `wartestuhl` and one `liege`.

## Libraries (swapping the look)

`"welt": {"bibliothek": "mine"}` loads `web/bibliothek/mine.js` (or `privat/bibliothek/mine.js`). A library is an ES module and may provide any of these exports. **Anything missing is taken from `standard` automatically.** A new library can therefore start with just one different desk.

```js
export function materialien(k) { return {M, T, bild} }  // M: materials, T: textures (T.hud[0..2], T.code, …), bild(name) → texture
export function umgebung(k, b) {}                        // sky, light, shadows; b = {x0,x1,zv,zh,w,d,cx,cz}
export function boden(k, raum) {}                        // floor; raum = {cx,cz,w,d,x0,x1,zv,zh,boden,…}
export function wand(k, g, w) {}                         // wall; g: group, local x along the wall, +z points into the room; w = {art, laenge, luecken:[[a,b]] (0…laenge), …}
export function figur(k, farbe) { return {root, body, head, headBall, arms:[l,r], legs:[l,r], mat, tipMat, statusMat, carry, items:{band, ordner, tasse}} }  // robot; statusMat is optional
export const teile = { schreibtisch(k, o) { … return {sitz} } }  // parts
```

**Toolkit `k`:**
- `THREE`, `scene`, `CSS2DObject`, `WH` (wall height), `rnd()` (seeded random)
- `ctex(w, h, draw, rx, ry)` creates a canvas texture.
- `std(opts)` creates a MeshStandardMaterial.
- `mesh(geo, mat, x, y, z, parent, shadow)`, `box(w, h, d, mat, x, y, z, parent)`, `cyl(rt, rb, h, mat, x, y, z, parent)`
- `gruppe(o)` returns a group at o.x/o.z with rotation o.ry.
- `punkt(g, lx, lz, lry)` converts a local point to world coordinates: {x, z, ry}.
- `sperre(g, lx0, lz0, lx1, lz1, margin)` blocks an area for path finding.
- `anzeigeTextur(inhalt, w, h)`, `figur(farbe)`, `cfg` (page configuration), `aktion('mutter'|'sekretariat')`, `portalUrl()`
- After `materialien()`, also `M`, `T`, `bild`.

**A part** receives `(k, o)`: `o` is the entry from the room file, with `o.x`/`o.z` in world coordinates and `o.ry` in radians. It returns an object with any of these fields:
- `sitz:{x,z,ry}` – seat
- `bett:{x,y,z,ry,ap:{x,z}}` and `liege:{…}` – `ap` is the access point
- `wartesitz:{x,z,ry}`
- `tischsitze:[…]`
- `anzeige:{inhalt, tex}` or `{inhalt:"regal", etiketten:[tex…]}`
- `tick(t, fx)` – called every frame; `fx` = {tresorT, pruefen, postFehler, mutterDenkt}

Clickable objects set `obj.userData.klick = {art:'mutter'|'sekretariat'|'link', url}`.

## Plugins (your own data sources)

A Python file in `privat/plugins/` (private) or `plugins/` (general) with a dictionary `QUELLEN`:

```python
def my_source(kern):
    # kern = {"zustand": fn(label) -> {geladen,pid,code}, "iso": fn(ts), "schwaerzen": fn(text) redacts secrets, "pfad": fn(p), "cfg": dict}
    return {
        "status": "ok",                     # ok · run · err · off
        "text": "running · last run 5 min ago",
        "naechst": None, "zuletzt": None,   # optional ISO time (next / last); a new „zuletzt“ starts the animation
        "abschnitte": [{"titel": "Details", "text": "summary",           # sections
                        "zeilen": [{"status": "ok", "titel": "Source A", "text": "last 10:00", "fehler": None}],  # rows
                        "hinweis": "small note below"}],
        "links": [{"text": "📄 Open", "url": "https://…"}],
    }

QUELLEN = {"my_source": my_source}
```

Use it in a robot with `"quelle": {"art": "plugin", "name": "my_source"}`, or as an extra with `"plugin": "my_source"`. The page calls plugins every 30 s. Keep them fast (timeouts for external calls ≤ 15 s) and catch errors yourself. Otherwise an error shows up as a red status.

## Secretariat, doctor, Mutter (Claude Code)

- **Secretariat:** Claude in plan mode with `Read`/`Grep`/`Glob` on the folders of the affected services (taken from their plist). Returns JSON `{diagnose, ursache, vorschlaege:[{titel, beschreibung, wer: claude|benutzer, risiko}]}` (diagnosis, cause, suggestions with title, description, who, risk).
- **Doctor:** Claude with `acceptEdits`. Bash only for a fixed list (`launchctl kickstart/print/list`, `plutil`, `cp`, `ls`, `tail`, `head`, `cat`, `grep`, `sleep`, `py_compile`, `date`, `stat`). Blocked: `rm`, `sudo`, `launchctl bootout/disable`, `security`, web. Rules from `regeln`. Result `{erfolg, bericht, benutzer}` (success, report, instructions for the user). Log in `daten/behandlungen.log`.
- **Mutter:** Claude in plan mode, reads `daten/status.json`. Tasks go to `daten/auftraege.json`.

## Checklist: add a new robot

1. Find the LaunchAgent label: `launchctl list | grep <name>`.
2. Check that the label matches `prefixe`.
3. Add the robot to `privat/config.json` under `agenten`: `id`, `name`, `quelle`, and `platz` or `start`.
4. Optional: `arbeit` (animation), `protokoll`, `farbe`, `info`.
5. Validate the JSON, restart the server (`launchctl kickstart -k gui/$(id -u)/<eigenes_label>` or `./start.sh`) and reload the page.
