#!/usr/bin/env python3
"""Maschinenraum – ein 3D-Leitstand für die Hintergrund-Dienste eines Macs (launchd).

Liefert die Seite aus und sammelt jede Minute den Zustand der LaunchAgents in daten/status.json.
Alles Persönliche (Bots, Aufgaben, Sicherungen, Regeln, Links) steht in privat/config.json,
eigene Zusatz-Datenquellen in privat/plugins/*.py. Ohne privat/config.json gilt config.example.json.

Sicherheit: lauscht nur auf 127.0.0.1. Bedienung (POST) nur mit Kopfzeile X-Maschinenraum: 1.
In status.json landen keine Programm-Argumente, Umgebungsvariablen oder Log-Inhalte.
Läuft mit dem System-Python von macOS (3.9) ohne Zusatzpakete.
"""
import datetime, glob, http.server, importlib.util, json, os, plistlib, re, shutil, socketserver, subprocess, threading, time
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
PRIVAT = os.path.join(HERE, "privat")
DATEN = os.path.join(HERE, "daten")
os.makedirs(DATEN, exist_ok=True)


def _cfg_laden():
    pfad = os.environ.get("MR_CONFIG") or (os.path.join(PRIVAT, "config.json") if os.path.isfile(os.path.join(PRIVAT, "config.json")) else os.path.join(HERE, "config.example.json"))
    with open(pfad, encoding="utf-8") as fh:
        return pfad, json.load(fh)


CFG_PFAD, CFG = _cfg_laden()
PORT = int(os.environ.get("MR_PORT") or CFG.get("port", 8790))
AGENTS = os.path.join(HOME, "Library/LaunchAgents")
PREFIXE = tuple(CFG.get("prefixe") or [])
EIGENES_LABEL = CFG.get("eigenes_label", "")
GRUPPEN = [(g["name"], g["muster"]) for g in CFG.get("gruppen", [])]
BACKUPS = [(b["name"], b["label"]) for b in CFG.get("sicherungen", [])]
BENUTZER = CFG.get("benutzer", "Nutzer")
RECHNER = CFG.get("rechner", "Mac")


def pfad(p):
    """~ und relative Pfade (relativ zum Projektordner) auflösen."""
    p = os.path.expanduser(p or "")
    return p if os.path.isabs(p) else os.path.join(HERE, p)


def eigen(label):
    """Gehört der Dienst zu den angezeigten? Ohne Präfix-Liste: alle außer Apple."""
    if not label or label.startswith("com.apple."):
        return False
    return label.startswith(PREFIXE) if PREFIXE else True


def sh(*cmd, timeout=10):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout
    except Exception:
        return ""


def iso(ts):
    return datetime.datetime.fromtimestamp(ts).astimezone().isoformat(timespec="seconds") if ts else None


GEHEIM = re.compile(r"(?i)(pass(wort|word)?|token|secret|api[_-]?key|authorization|bearer)([\"']?\s*[=:]\s*|\s+)\S+")


def schwaerzen(text):
    return GEHEIM.sub(lambda m: m.group(1) + "=***", text)


# ── Zeitpläne ─────────────────────────────────────────────
def naechster(cal, ab):
    """Nächster Termin für StartCalendarInterval (dict oder Liste), minutengenau, höchstens 35 Tage voraus."""
    eintraege = cal if isinstance(cal, list) else [cal]
    t = ab.replace(second=0, microsecond=0) + datetime.timedelta(minutes=1)
    ende = t + datetime.timedelta(days=35)
    while t < ende:
        for e in eintraege:
            wd = (t.isoweekday() % 7)  # launchd: 0 = Sonntag
            if ("Minute" in e and e["Minute"] != t.minute) or ("Hour" in e and e["Hour"] != t.hour) or \
               ("Day" in e and e["Day"] != t.day) or ("Month" in e and e["Month"] != t.month) or \
               ("Weekday" in e and (e["Weekday"] % 7) != wd):
                continue
            return t
        if all("Hour" in e and e["Hour"] != t.hour for e in eintraege):
            t = t.replace(minute=0) + datetime.timedelta(hours=1)
        else:
            t += datetime.timedelta(minutes=1)
    return None


TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]


def rhythmus(cal=None, intervall=None, cron=None):
    """Zeitplan in Klartext: „täglich 01:30“, „stündlich :00“, „So 04:00“, „alle 15 min“."""
    if intervall:
        return f"alle {intervall // 60} min" if intervall < 7200 else f"alle {intervall // 3600} h"
    if cron:
        t = cron.split()
        if len(t) == 5 and t[0].isdigit() and t[1].isdigit():
            zeit = f"{int(t[1]):02d}:{int(t[0]):02d}"
            if t[2:] == ["*", "*", "*"]:
                return f"täglich {zeit}"
            if t[2] == "*" and t[3] == "*" and t[4].isdigit():
                return f"{TAGE[int(t[4]) % 7]} {zeit}"
        return cron
    if not cal:
        return None
    teile = []
    for e in (cal if isinstance(cal, list) else [cal]):
        h, m = e.get("Hour"), e.get("Minute", 0)
        zeit = f"{h:02d}:{m:02d}" if h is not None else None
        if "Day" in e:
            teile.append(f"monatlich am {e['Day']}." + (f", {zeit}" if zeit else ""))
        elif "Weekday" in e:
            teile.append(f"{TAGE[e['Weekday'] % 7]} {zeit or ''}".strip())
        elif zeit:
            teile.append(f"täglich {zeit}")
        else:
            teile.append(f"stündlich :{m:02d}")
    return "; ".join(teile)


# ── LaunchAgents einsammeln ───────────────────────────────
def letzte_aktivitaet(p):
    """Zeitstempel der jüngsten Log-Datei eines Jobs (stdout/stderr, sonst logs/ neben dem Skript)."""
    kandidaten = [p.get("StandardOutPath"), p.get("StandardErrorPath")]
    for a in (p.get("ProgramArguments") or [])[1:]:
        if isinstance(a, str) and a.startswith("/") and a.endswith((".py", ".sh", ".js")) and os.path.isfile(a):
            d = os.path.dirname(a)
            kandidaten += glob.glob(os.path.join(d, "logs", "*.log")) + glob.glob(os.path.join(d, "*.log"))
    best = 0
    for k in kandidaten:
        try:
            if k and os.path.isfile(k):
                best = max(best, os.path.getmtime(k))
        except OSError:
            pass
    return best or None


def deaktivierte():
    out = set()
    for z in sh("launchctl", "print-disabled", f"gui/{os.getuid()}").splitlines():
        m = re.search(r'"([^"]+)"\s*=>\s*(disabled|true)', z)
        if m:
            out.add(m.group(1))
    return out


def jobs_sammeln():
    aus = deaktivierte()
    geladen = {}
    for z in sh("launchctl", "list").splitlines()[1:]:
        teile = z.split("\t")
        if len(teile) == 3:
            pid, code, label = teile
            geladen[label] = (None if pid == "-" else int(pid), int(code) if code.lstrip("-").isdigit() else None)
    jetzt = datetime.datetime.now()
    jobs = []
    for f in sorted(glob.glob(os.path.join(AGENTS, "*.plist"))):
        name = os.path.basename(f)[:-6]
        if not eigen(name) or re.search(r"bak|deaktiv|vorbereitet|disabled", name):
            continue
        try:
            with open(f, "rb") as fh:
                p = plistlib.load(fh)
        except Exception:
            continue
        label = p.get("Label", name)
        cal, intervall, keep = p.get("StartCalendarInterval"), p.get("StartInterval"), p.get("KeepAlive")
        # KeepAlive nur „bei Fehler neu starten“ ist kein Dauerdienst, sondern ein Einmal-Lauf
        nur_bei_fehler = isinstance(keep, dict) and set(keep) == {"SuccessfulExit"} and keep["SuccessfulExit"] is False
        dauer = bool(keep) and not nur_bei_fehler and not cal and not intervall
        pid, code = geladen.get(label, (None, None))
        if label not in geladen:
            status = "off"
        elif pid and not dauer:
            status = "run"
        elif dauer:
            status = "ok" if pid else ("err" if code not in (0, None) else "off")
        else:
            status = "ok" if code in (0, None) else "err"
        zuletzt = letzte_aktivitaet(p)
        naechst = None
        if cal:
            n = naechster(cal, jetzt)
            naechst = n.timestamp() if n else None
        elif intervall and zuletzt:
            naechst = max(zuletzt + intervall, time.time())
        plan = ("dauerhaft" if dauer else
                f"alle {intervall // 60} min" if intervall and intervall < 7200 else
                f"alle {intervall // 3600} h" if intervall else
                "nach Zeitplan" if cal else "bei Start")
        gruppe = next((g for g, m in GRUPPEN if re.search(m, label)), "Sonstige")
        jobs.append({"label": label, "gruppe": gruppe, "status": status, "code": code, "laeuft": bool(pid),
                     "geladen": label in geladen, "deaktiviert": label in aus, "dauer": dauer,
                     "plan": plan, "rhythmus": rhythmus(cal, intervall) or plan, "zuletzt": iso(zuletzt), "naechst": iso(naechst)})
    return jobs


def cron_json():
    """Optional: Zeitpläne aus einer cron-JSON-Datei (Format: {"jobs":[…]})."""
    c = CFG.get("cron_json")
    if not c:
        return []
    try:
        with open(pfad(c["datei"])) as fh:
            d = json.load(fh)
        out = []
        for j in (d.get("jobs", []) if isinstance(d, dict) else d):
            st = "off" if not j.get("enabled", True) else ("ok" if j.get("last_status") in ("ok", None) else "err")
            expr = (j.get("schedule") or {}).get("expr") if isinstance(j.get("schedule"), dict) else None
            out.append({"name": j.get("name"), "status": st, "zuletzt": j.get("last_run_at"), "naechst": j.get("next_run_at"),
                        "rhythmus": rhythmus(cron=expr) if expr else c.get("name", "Cron")})
        return out
    except Exception:
        return []


def system(jobs):
    ncpu = os.cpu_count() or 1
    last = os.getloadavg()[0] / ncpu * 100
    mem = int(sh("sysctl", "-n", "hw.memsize").strip() or 0)
    vm = sh("vm_stat")
    seite = int(re.search(r"page size of (\d+)", vm).group(1)) if "page size" in vm else 16384

    def seiten(k):
        m = re.search(k + r":\s+(\d+)", vm)
        return int(m.group(1)) if m else 0
    belegt = (seiten("Pages active") + seiten("Pages wired down") + seiten("Pages occupied by compressor")) * seite

    def platte(p):
        try:
            u = shutil.disk_usage(p)
            return round(u.used / u.total * 100), round(u.free / 1e12, 2)
        except OSError:
            return None, None
    zeilen = [
        ["CPU-Last", f"{last:.0f} %", "ok" if last < 70 else "err"],
        [f"Arbeitsspeicher {mem / 2**30:.0f} GB", f"{belegt / mem * 100:.0f} % belegt" if mem else "?", "ok" if mem and belegt / mem < .9 else "err"],
    ]
    for v in [{"name": "Systemplatte", "pfad": "/System/Volumes/Data"}] + CFG.get("laufwerke", []):
        p, frei = platte(v["pfad"])
        zeilen.append([v["name"], f"{p} % · {frei} TB frei" if p is not None else "nicht eingebunden", "ok" if p is not None and p < 90 else "err"])
    dienste = [j for j in jobs if j["plan"] == "dauerhaft" and j["geladen"]]
    dienste_ok = sum(1 for j in dienste if j["status"] == "ok")
    abgeschaltet = sum(1 for j in jobs if j["plan"] == "dauerhaft" and not j["geladen"])
    fehler = [j for j in jobs if j["status"] == "err"]
    therm = sh("pmset", "-g", "therm")
    temp_ok = "No thermal warning" in therm or "CPU_Speed_Limit" not in therm or "= 100" in therm
    zeilen += [
        ["Dauerdienste", f"{dienste_ok} / {len(dienste)} laufen" + (f" · {abgeschaltet} aus" if abgeschaltet else ""), "ok" if dienste_ok == len(dienste) else "err"],
        ["Aufgaben mit Fehler", str(len(fehler)), "ok" if not fehler else "err"],
        ["Temperatur", "normal" if temp_ok else "gedrosselt", "ok" if temp_ok else "err"],
    ]
    ts_bin = shutil.which("tailscale") or ("/opt/homebrew/bin/tailscale" if os.path.exists("/opt/homebrew/bin/tailscale") else None)
    if ts_bin:
        try:
            ts_ok = json.loads(sh(ts_bin, "status", "--json")).get("BackendState") == "Running"
        except Exception:
            ts_ok = False
        zeilen.append(["Tailscale / Netz", "verbunden" if ts_ok else "getrennt", "ok" if ts_ok else "err"])
    return {"zeilen": zeilen, "status": "ok" if all(z[2] == "ok" for z in zeilen) else "err"}


def sammeln():
    jobs = jobs_sammeln()
    nach = {j["label"]: j for j in jobs}
    cron = cron_json()
    sich = [dict(nach[l], name=n) for n, l in BACKUPS if l in nach]
    c = CFG.get("cron_json") or {}
    for j in cron:
        if re.search(c.get("sicherungs_muster", "sicherung|backup"), (j["name"] or "").lower()):
            sich.append({"name": f"{j['name']} ({c.get('name', 'Cron')})", "label": "cron", "status": j["status"], "zuletzt": j["zuletzt"],
                         "naechst": j["naechst"], "plan": c.get("name", "Cron"), "rhythmus": j["rhythmus"]})
    gruppen = {}
    for j in jobs:
        g = gruppen.setdefault(j["gruppe"], {"name": j["gruppe"], "anzahl": 0, "fehler": 0, "aus": 0})
        g["anzahl"] += 1
        g["fehler"] += j["status"] == "err"
        g["aus"] += j["status"] == "off"
    reihenfolge = [g for g, _ in GRUPPEN] + ["Sonstige"]
    return {"erzeugt": iso(time.time()), "system": system(jobs), "sicherungen": sich, "cron": cron,
            "gruppen": sorted(gruppen.values(), key=lambda g: reihenfolge.index(g["name"]) if g["name"] in reihenfolge else 99),
            "jobs": jobs}


DEMO = os.environ.get("MR_DEMO") == "1"
DEMO_START = time.time()


def demo_status():
    """Erfundene Beispieldaten (MR_DEMO=1): zum Ausprobieren und für Bildschirmfotos, ohne echte Dienste."""
    jetzt = DEMO_START  # feste Zeiten, sonst sieht jeder Abruf wie ein neuer Lauf aus

    def job(label, gruppe, status, plan, vor_min, in_min=None, code=0, dauer=False):
        return {"label": label, "gruppe": gruppe, "status": status, "code": code, "laeuft": status == "run" or dauer, "geladen": status != "off",
                "deaktiviert": False, "dauer": dauer, "plan": plan, "rhythmus": plan, "zuletzt": iso(jetzt - vor_min * 60),
                "naechst": iso(jetzt + in_min * 60) if in_min else None}
    jobs = [job("com.example.backup-nacht", "Sicherungen", "ok", "täglich 01:30", 420, 600),
            job("com.example.backup-fotos", "Sicherungen", "ok", "täglich 03:00", 330, 690),
            job("com.example.backup-pruefung", "Sicherungen", "ok", "So 04:00", 2000, 4000),
            job("com.example.mail-abruf", "Mail", "err", "alle 15 min", 4, 11, code=1),
            job("com.example.konten", "Sonstige", "run", "alle 3 h", 1, 180),
            job("com.example.pruefer", "Sonstige", "ok", "täglich 06:45", 600, 800),
            job("homebrew.mxcl.postgresql", "Homebrew-Dienste", "ok", "dauerhaft", 3000, dauer=True),
            job("homebrew.mxcl.nginx", "Homebrew-Dienste", "ok", "dauerhaft", 3000, dauer=True),
            job("com.example.sync", "Sonstige", "off", "alle 30 min", 9000)]
    sich = [dict(j, name=n) for n, j in zip(["Nacht-Sicherung", "Fotos", "Prüfung"], jobs[:3])]
    gruppen = {}
    for j in jobs:
        g = gruppen.setdefault(j["gruppe"], {"name": j["gruppe"], "anzahl": 0, "fehler": 0, "aus": 0})
        g["anzahl"] += 1
        g["fehler"] += j["status"] == "err"
    zeilen = [["CPU-Last", "18 %", "ok"], ["Arbeitsspeicher 64 GB", "52 % belegt", "ok"], ["Systemplatte", "41 % · 1.2 TB frei", "ok"],
              ["Dauerdienste", "2 / 2 laufen", "ok"], ["Aufgaben mit Fehler", "1", "err"], ["Temperatur", "normal", "ok"]]
    return {"erzeugt": iso(time.time()), "system": {"zeilen": zeilen, "status": "err"}, "sicherungen": sich, "cron": [],
            "gruppen": list(gruppen.values()), "jobs": jobs}


def sammler():
    while True:
        try:
            d = sammeln()
            tmp = os.path.join(DATEN, ".status.json.tmp")
            with open(tmp, "w") as fh:
                json.dump(d, fh, ensure_ascii=False)
            os.replace(tmp, os.path.join(DATEN, "status.json"))
        except Exception as e:
            print(time.strftime("%d.%m.%Y %H:%M:%S"), "Sammler-Fehler:", e, flush=True)
        time.sleep(60)


# ── Diagnose, Protokolle, Bedienung ───────────────────────
DIAGNOSEN = [
    (r"unable to open database file|Operation not permitted|authorization denied|not authorized", "macOS verweigert den Zugriff: Dem Programm fehlt eine Datenschutz-Freigabe (meist „Festplattenvollzugriff“) – oft nach einem Python-/Programm-Update."),
    (r"No such file or directory|can't open file|command not found", "Eine Datei oder ein Programm fehlt (Pfad falsch oder verschoben)."),
    (r"ModuleNotFoundError|ImportError", "Ein Python-Paket fehlt in der Umgebung des Bots."),
    (r"timed out|Connection refused|Name or service not known|Temporary failure in name resolution|Network is unreachable", "Ein Server oder Dienst ist nicht erreichbar (Netz, Port oder Gegenstelle aus)."),
    (r"Permission denied", "Keine Rechte auf eine Datei oder einen Ordner."),
    (r"database is locked", "Datenbank gerade gesperrt (anderer Prozess schreibt)."),
    (r"401|403|Unauthorized|Forbidden|invalid.*(key|token)", "Anmeldung abgelehnt: Zugangsdaten/Schlüssel ungültig oder abgelaufen."),
]
CODES = {127: "Programm nicht gefunden (Code 127).", 126: "Programm nicht ausführbar (Code 126)."}
CODES.update({int(k): v for k, v in (CFG.get("exit_codes") or {}).items()})


def plist_von(label):
    for f in glob.glob(os.path.join(AGENTS, "*.plist")):
        if os.path.basename(f)[:-6] == label:
            try:
                with open(f, "rb") as fh:
                    return f, plistlib.load(fh)
            except Exception:
                return f, {}
    return None, None


def log_ende(p, zeilen=40):
    dateien = [p.get("StandardErrorPath"), p.get("StandardOutPath")]
    for a in (p.get("ProgramArguments") or [])[1:]:
        if isinstance(a, str) and a.startswith("/") and a.endswith((".py", ".sh", ".js")) and os.path.isfile(a):
            d = os.path.dirname(a)
            dateien += sorted(glob.glob(os.path.join(d, "logs", "*")) + glob.glob(os.path.join(d, "*.log")), key=lambda x: os.path.getmtime(x) if os.path.isfile(x) else 0)[-2:]
    out = []
    for f in dict.fromkeys(x for x in dateien if x and os.path.isfile(x)):
        try:
            with open(f, "rb") as fh:
                fh.seek(max(0, os.path.getsize(f) - 20000))
                text = fh.read().decode("utf-8", "replace").splitlines()[-zeilen:]
            out.append({"datei": f.replace(HOME, "~"), "geaendert": iso(os.path.getmtime(f)), "zeilen": [schwaerzen(z)[:300] for z in text]})
        except OSError:
            pass
    return out


def diagnose(code, logs):
    text = "\n".join(z for l in logs for z in l["zeilen"][-25:])
    for muster, erklaerung in DIAGNOSEN:
        if re.search(muster, text):
            return erklaerung
    if code in CODES:
        return CODES[code]
    if code not in (0, None):
        return f"Lauf endete mit Code {code} – Details im Protokoll unten."
    return None


def zustand(label):
    for z in sh("launchctl", "list").splitlines()[1:]:
        t = z.split("\t")
        if len(t) == 3 and t[2] == label:
            return {"geladen": True, "pid": None if t[0] == "-" else int(t[0]), "code": int(t[1]) if t[1].lstrip("-").isdigit() else None}
    return {"geladen": False, "pid": None, "code": None}


def aktion(label, was):
    f, p = plist_von(label)
    if not f or not eigen(label) or label == EIGENES_LABEL:
        return {"ok": False, "meldung": "Diese Aufgabe darf hier nicht bedient werden."}
    dom = f"gui/{os.getuid()}"
    vorher = zustand(label)
    schritte = []

    def run(*cmd):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        schritte.append({"befehl": " ".join(cmd[:3]) + " …", "code": r.returncode, "ausgabe": (r.stderr or r.stdout).strip()[:300]})
        return r.returncode
    if was == "starten":
        if label in deaktivierte():
            run("launchctl", "enable", f"{dom}/{label}")
        if not vorher["geladen"]:
            run("launchctl", "bootstrap", dom, f)
        run("launchctl", "kickstart", "-k", f"{dom}/{label}")
        ende = time.time() + 8
        while time.time() < ende:
            time.sleep(1)
            z = zustand(label)
            if z["pid"] is None and z["code"] is not None and time.time() > ende - 6:
                break
    elif was == "stoppen":
        dauer = bool(p.get("KeepAlive")) and not p.get("StartCalendarInterval") and not p.get("StartInterval")
        if vorher["geladen"]:
            run("launchctl", "bootout" if dauer else "kill", *(() if dauer else ("SIGTERM",)), f"{dom}/{label}")
    elif was == "pausieren":
        if vorher["geladen"]:
            run("launchctl", "bootout", f"{dom}/{label}")
    elif was == "deaktivieren":
        run("launchctl", "disable", f"{dom}/{label}")
        if vorher["geladen"]:
            run("launchctl", "bootout", f"{dom}/{label}")
    elif was == "aktivieren":
        run("launchctl", "enable", f"{dom}/{label}")
        if not zustand(label)["geladen"]:
            run("launchctl", "bootstrap", dom, f)
    else:
        return {"ok": False, "meldung": "Unbekannte Aktion."}
    nachher = zustand(label)
    logs = log_ende(p)
    print(time.strftime("%d.%m.%Y %H:%M:%S"), "Aktion", was, label, "→", nachher, flush=True)
    return {"ok": all(x["code"] == 0 for x in schritte) or was == "starten", "label": label, "aktion": was, "schritte": schritte,
            "vorher": vorher, "nachher": nachher, "deaktiviert": label in deaktivierte(),
            "diagnose": diagnose(nachher["code"], logs) if was == "starten" or nachher["code"] not in (0, None) else None, "logs": logs}


def programm_app(p):
    """Interpreter/Programm eines Jobs → das .app-Paket, das macOS für Datenschutz-Freigaben erwartet."""
    kandidaten = []
    for a in p.get("ProgramArguments") or []:
        if not isinstance(a, str) or not a.startswith("/") or a in ("/usr/sbin/taskpolicy", "/usr/bin/nice", "/bin/bash", "/bin/sh", "/bin/zsh"):
            continue
        if a.endswith(".sh") and os.path.isfile(a):
            try:
                text = open(a, errors="replace").read()
                kandidaten += re.findall(r"[\"'](/[^\"']*/python[0-9.]*)[\"']", text) + re.findall(r"(?<![\"'\w])(/[^\s\"']*/python[0-9.]*)", text)
            except OSError:
                pass
            continue
        kandidaten.append(a)
    for a in kandidaten:
        echt = os.path.realpath(a)
        m = re.match(r"(.*/Python\.framework/Versions/[^/]+)/", echt)
        if m and os.path.isdir(m.group(1) + "/Resources/Python.app"):
            return m.group(1) + "/Resources/Python.app"
        if os.path.isfile(echt) and os.access(echt, os.X_OK):
            return echt
    return None


def freigabe(label):
    f, p = plist_von(label)
    if not f or not eigen(label):
        return {"ok": False, "meldung": "Unbekannte Aufgabe."}
    app = programm_app(p)
    subprocess.run(["open", "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles"], timeout=10)
    if app:
        subprocess.run(["open", "-R", app], timeout=10)
    return {"ok": True, "aktion": "freigabe", "app": app,
            "meldung": f"Auf dem {RECHNER} sind jetzt die Systemeinstellungen (Festplattenvollzugriff) offen" + (" und der Finder zeigt das Programm. Ziehe es ins Einstellungsfenster und schalte es ein. Danach hier ▶ Starten." if app else ". Das Programm konnte ich nicht ermitteln.")}


def protokoll(bot_id):
    """Letzter Lauf eines Bots aus seiner Protokolldatei (nur Dateien, die in der Konfiguration stehen)."""
    b = next((a for a in CFG.get("agenten", []) if a.get("id") == bot_id), None)
    if not b or not b.get("protokoll"):
        return {"da": False, "hinweis": "Für diesen Bot ist kein Protokoll eingetragen."}
    datei = pfad(b["protokoll"])
    if not os.path.isfile(datei):
        return {"da": False, "hinweis": "Noch kein Lauf protokolliert. Der Bot ist vielleicht noch nicht eingerichtet."}
    try:
        with open(datei, encoding="utf-8", errors="replace") as fh:
            zeilen = fh.read().splitlines()[-600:]
    except OSError as e:
        return {"da": False, "hinweis": f"Protokoll nicht lesbar: {e}"}
    marke = b.get("protokoll_lauf", " Lauf ")
    start = max([i for i, z in enumerate(zeilen) if marke in z] or [0])
    block = zeilen[start:]
    ergebnis = next((z.split("Ergebnis:", 1)[1].strip() for z in reversed(block) if "Ergebnis:" in z), None)
    return {"da": True, "zeit": block[0][:19] if block else None, "ergebnis": ergebnis,
            "zeilen": [schwaerzen(z)[:300] for z in block[:60]], "geaendert": iso(os.path.getmtime(datei))}


# ── Plugins: eigene Datenquellen (privat/plugins/*.py) ────
PLUGINS = {}


def plugins_laden():
    ordner = [os.path.join(HERE, "plugins"), os.path.join(PRIVAT, "plugins")] + [pfad(o) for o in CFG.get("plugin_ordner", [])]
    for o in ordner:
        for f in sorted(glob.glob(os.path.join(o, "*.py"))):
            try:
                spec = importlib.util.spec_from_file_location("mr_plugin_" + os.path.basename(f)[:-3], f)
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                for name, fn in getattr(mod, "QUELLEN", {}).items():
                    PLUGINS[name] = fn
            except Exception as e:
                print(time.strftime("%d.%m.%Y %H:%M:%S"), "Plugin-Fehler", f, e, flush=True)


KERN = None  # wird beim Start gesetzt: Hilfsfunktionen für Plugins


def plugin_abfragen(name):
    fn = PLUGINS.get(name)
    if not fn:
        return {"status": "off", "text": f"Plugin „{name}“ nicht gefunden"}
    try:
        return fn(KERN)
    except Exception as e:  # noqa: BLE001
        return {"status": "err", "text": f"Plugin-Fehler: {e}"[:300]}


# ── Mutter: Gespräch mit Claude (nur lesend) + Auftragsliste ──
MUTTER_LOCK = threading.Lock()
MUTTER = {"sitzung": None}
AUFTRAEGE = os.path.join(DATEN, "auftraege.json")
MUTTER_PROMPT = CFG.get("mutter_prompt") or (
    f"Du bist „Mutter“, der Großrechner im Maschinenraum des Rechners „{RECHNER}“. Antworte auf Deutsch, kurz und direkt, "
    "erst Ergebnis, dann Beleg. Niemals raten. Der aktuelle Zustand steht in status.json in deinem Arbeitsordner "
    "(Aufgaben, Sicherungen, Fehler, Systemwerte) – lies ihn bei Fragen dazu. Du darfst nur lesen, nichts ändern oder ausführen. "
    f"Wenn {BENUTZER} etwas erledigt haben will, schlage einen klaren Auftragstext vor, den er mit „Als Auftrag speichern“ an Claude übergibt.")
CLAUDE = pfad(CFG.get("claude") or shutil.which("claude") or "~/.local/bin/claude")
CLAUDE_ENV = dict(os.environ, PATH=os.path.dirname(CLAUDE) + ":/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", HOME=HOME)


def mutter_fragen(nachricht, neu=False):
    if not MUTTER_LOCK.acquire(timeout=1):
        return {"ok": False, "antwort": "Mutter denkt gerade noch über die letzte Frage nach – bitte kurz warten."}
    try:
        if neu:
            MUTTER["sitzung"] = None
        cmd = [CLAUDE, "-p", nachricht, "--output-format", "json", "--permission-mode", "plan",
               "--allowedTools", "Read", "Grep", "Glob", "--append-system-prompt", MUTTER_PROMPT]
        if MUTTER["sitzung"]:
            cmd += ["--resume", MUTTER["sitzung"]]
        t = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=240, cwd=DATEN, stdin=subprocess.DEVNULL, env=CLAUDE_ENV)
        try:
            d = json.loads(r.stdout)
            MUTTER["sitzung"] = d.get("session_id") or MUTTER["sitzung"]
            antwort = d.get("result") or d.get("error") or "(keine Antwort)"
        except Exception:
            antwort = (r.stderr or r.stdout or "Keine Antwort von Claude.").strip()[-800:]
        return {"ok": r.returncode == 0, "antwort": schwaerzen(antwort), "sekunden": round(time.time() - t)}
    except FileNotFoundError:
        return {"ok": False, "antwort": f"Claude-Programm nicht gefunden ({CLAUDE}). In der Konfiguration unter „claude“ eintragen."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "antwort": "Zeitüberschreitung: Claude hat nicht innerhalb von 4 Minuten geantwortet."}
    finally:
        MUTTER_LOCK.release()


def json_datei(p, leer):
    try:
        with open(p) as fh:
            return json.load(fh)
    except Exception:
        return leer


def json_schreiben(p, daten):
    tmp = p + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(daten, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, p)


# ── Sekretariat (Analyse, nur lesend) und Arzt (Reparatur durch Claude) ──
FAELLE_DATEI = os.path.join(DATEN, "faelle.json")
BEHANDLUNGEN = os.path.join(DATEN, "behandlungen.log")
FAELLE_LOCK = threading.Lock()
REGELN = CFG.get("regeln") or (
    "Regeln (verbindlich): Deutsch, kurz, direkt. Niemals raten – nur was du in Dateien/Logs siehst. "
    "Vor jeder Änderung an einer Datei eine Sicherung daneben anlegen (Name.bak-arzt-JJJJMMTT-HHMM). Nichts löschen. "
    "Keine Systemeinstellungen, kein sudo, keine Passwörter oder Schlüssel anfassen oder ausgeben. "
    f"Was nur {BENUTZER} selbst kann (Datenschutz-Freigaben, Passwörter, sudo), nicht versuchen, sondern als klare Schritt-für-Schritt-Anweisung zurückgeben.")


def fall_speichern(fall):
    with FAELLE_LOCK:
        alle = json_datei(FAELLE_DATEI, {})
        alle[fall["id"]] = fall
        for k in sorted(alle, key=lambda k: alle[k].get("start", ""))[:-60]:
            alle.pop(k, None)
        json_schreiben(FAELLE_DATEI, alle)


def akte(labels):
    """Krankenakte: Zustand, Zeitplan, Programm, Protokoll-Ende je Aufgabe (geschwärzt)."""
    teile, ordner = [], set()
    for label in labels:
        f, p = plist_von(label)
        if not f:
            continue
        z = zustand(label)
        args = [schwaerzen(str(a)) for a in (p.get("ProgramArguments") or [])]
        for a in p.get("ProgramArguments") or []:
            if isinstance(a, str) and a.startswith("/") and os.path.exists(a):
                ordner.add(os.path.dirname(a) if os.path.isfile(a) else a)
        logs = log_ende(p, 30)
        for l in logs:
            ordner.add(os.path.dirname(l["datei"].replace("~", HOME, 1)))
        teile.append(f"### {label}\nPlist: {f}\nZustand: {z} · deaktiviert: {label in deaktivierte()}\n"
                     f"Zeitplan: {rhythmus(p.get('StartCalendarInterval'), p.get('StartInterval')) or ('dauerhaft' if p.get('KeepAlive') else 'bei Start')}\n"
                     f"Programm: {' '.join(args)}\nVorab-Diagnose: {diagnose(z['code'], logs) or '–'}\n"
                     + "\n".join(f"Protokoll {l['datei']} (geändert {l['geaendert']}):\n" + "\n".join(l["zeilen"][-25:]) for l in logs))
    return "\n\n".join(teile), sorted(o for o in ordner if o and os.path.isdir(o))


def claude_lauf(prompt, modus, ordner, werkzeuge, timeout):
    cmd = [CLAUDE, "-p", prompt, "--output-format", "json", "--permission-mode", modus, "--allowedTools", *werkzeuge,
           "--disallowedTools", "Bash(rm:*)", "Bash(sudo:*)", "Bash(launchctl bootout:*)", "Bash(launchctl disable:*)", "Bash(security:*)", "WebFetch", "WebSearch"]
    for o in ordner[:12]:
        cmd += ["--add-dir", o]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=DATEN, stdin=subprocess.DEVNULL, env=CLAUDE_ENV)
    try:
        d = json.loads(r.stdout)
        return d.get("result") or d.get("error") or ""
    except Exception:
        return (r.stderr or r.stdout or "").strip()[-1500:]


def json_aus(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def sekretariat(fall):
    try:
        text, ordner = akte(fall["labels"])
        prompt = (f"Du bist das Sekretariat im Maschinenraum. Untersuche den Bot „{fall['bot']}“ und seine Aufgaben. Nur lesen, nichts ändern. "
                  f"Du darfst die Skripte und Protokolle in den genannten Ordnern lesen.\n{REGELN}\n\nAKTE:\n{text}\n\n"
                  "Antworte NUR mit JSON: {\"diagnose\": \"ein Satz, was kaputt ist\", \"ursache\": \"warum, mit Beleg (Datei/Zeile/Log)\", "
                  "\"vorschlaege\": [{\"titel\": \"…\", \"beschreibung\": \"konkret, was geändert wird\", \"wer\": \"claude\" oder \"benutzer\", \"risiko\": \"gering|mittel|hoch\"}] } "
                  "– genau 3 Vorschläge, der beste zuerst. Wenn alles in Ordnung ist: diagnose \"gesund\" und trotzdem 3 Verbesserungsvorschläge.")
        antwort = claude_lauf(prompt, "plan", ordner, ["Read", "Grep", "Glob"], 300)
        a = json_aus(antwort)
        if not a or not isinstance(a.get("vorschlaege"), list):
            fall.update(phase="fehler", meldung="Analyse ohne verwertbares Ergebnis: " + schwaerzen(antwort)[:800])
        else:
            a["vorschlaege"] = a["vorschlaege"][:3]
            fall.update(phase="analysiert", analyse=a)
    except subprocess.TimeoutExpired:
        fall.update(phase="fehler", meldung="Analyse dauerte länger als 5 Minuten.")
    except Exception as e:
        fall.update(phase="fehler", meldung=f"Analyse-Fehler: {e}")
    fall["ende_analyse"] = iso(time.time())
    fall_speichern(fall)


def arzt(fall, nr):
    try:
        v = fall["analyse"]["vorschlaege"][nr]
        text, ordner = akte(fall["labels"])
        prompt = (f"Du bist der Arzt im Maschinenraum. Repariere den Bot „{fall['bot']}“ nach diesem Vorschlag:\n"
                  f"{v.get('titel')}: {v.get('beschreibung')}\n\nBisherige Diagnose: {fall['analyse'].get('diagnose')} – {fall['analyse'].get('ursache')}\n"
                  f"{REGELN}\n\nAKTE:\n{text}\n\nGehe so vor: 1. Ursache in den Dateien bestätigen. 2. Minimal ändern (Sicherung zuerst). "
                  "3. Aufgabe mit `launchctl kickstart -k gui/$(id -u)/<label>` testen und Protokoll prüfen. "
                  "Antworte am Ende NUR mit JSON: {\"erfolg\": true/false, \"bericht\": \"was du geändert hast (Dateien, Sicherungen)\", \"benutzer\": \"Anweisung an den Nutzer oder leer\"}")
        werkzeuge = ["Read", "Grep", "Glob", "Edit", "Write", "Bash(launchctl kickstart:*)", "Bash(launchctl print:*)", "Bash(launchctl list:*)",
                     "Bash(plutil:*)", "Bash(cp:*)", "Bash(ls:*)", "Bash(tail:*)", "Bash(head:*)", "Bash(cat:*)", "Bash(grep:*)", "Bash(sleep:*)",
                     "Bash(/usr/bin/python3 -m py_compile:*)", "Bash(python3 -m py_compile:*)", "Bash(date:*)", "Bash(stat:*)"]
        antwort = claude_lauf(prompt, "acceptEdits", ordner, werkzeuge, 900)
        e = json_aus(antwort) or {"erfolg": False, "bericht": schwaerzen(antwort)[:1500], "benutzer": ""}
        fall.update(phase="fertig", ergebnis=e, nachher={l: zustand(l) for l in fall["labels"]})
        with open(BEHANDLUNGEN, "a") as fh:
            fh.write(f"{time.strftime('%d.%m.%Y %H:%M')} · Fall {fall['id']} · {fall['bot']} · Vorschlag: {v.get('titel')} · Erfolg: {e.get('erfolg')} · {str(e.get('bericht'))[:400]}\n")
    except subprocess.TimeoutExpired:
        fall.update(phase="fehler", meldung="Behandlung dauerte länger als 15 Minuten.")
    except Exception as ex:
        fall.update(phase="fehler", meldung=f"Behandlungs-Fehler: {ex}")
    fall["ende_arzt"] = iso(time.time())
    fall_speichern(fall)


def fall_api(d):
    if d.get("was") == "sekretariat":
        labels = [l for l in d.get("labels", []) if isinstance(l, str) and plist_von(l)[0] and eigen(l)][:12]
        if not labels:
            return {"ok": False, "meldung": "Dieser Bot hat keine eigenen Aufgaben zum Untersuchen."}
        fall = {"id": str(int(time.time() * 1000)), "bot": str(d.get("bot", ""))[:60], "botid": str(d.get("botid", ""))[:30], "labels": labels,
                "phase": "sekretariat", "start": iso(time.time())}
        fall_speichern(fall)
        threading.Thread(target=sekretariat, args=(fall,), daemon=True).start()
        return {"ok": True, "fall": fall}
    if d.get("was") == "arzt":
        fall = json_datei(FAELLE_DATEI, {}).get(str(d.get("id")))
        nr = int(d.get("vorschlag", 0))
        if not fall or fall.get("phase") != "analysiert" or not (0 <= nr < len(fall["analyse"]["vorschlaege"])):
            return {"ok": False, "meldung": "Fall nicht bereit für den Arzt."}
        fall.update(phase="arzt", gewaehlt=nr, start_arzt=iso(time.time()))
        fall_speichern(fall)
        threading.Thread(target=arzt, args=(fall, nr), daemon=True).start()
        return {"ok": True, "fall": fall}
    return {"ok": False, "meldung": "Unbekannt."}


# ── Konfiguration für die Seite ───────────────────────────
def raum_vorlage(name):
    for o in (os.path.join(PRIVAT, "raeume"), os.path.join(HERE, "raeume")):
        f = os.path.join(o, os.path.basename(name) + ".json")
        if os.path.isfile(f):
            with open(f, encoding="utf-8") as fh:
                return json.load(fh)
    raise FileNotFoundError(f"Raum-Vorlage „{name}“ nicht gefunden")


def seiten_config():
    """Was die Seite braucht – ohne Pfade zu Protokollen. Raum-Vorlagen werden hier eingesetzt."""
    welt = dict(CFG.get("welt") or {})
    raeume = []
    for r in welt.get("raeume", []):
        basis = raum_vorlage(r["vorlage"]) if r.get("vorlage") else {}
        raeume.append({**basis, **{k: v for k, v in r.items() if k != "vorlage"}})
    welt["raeume"] = raeume
    agenten = [dict({k: v for k, v in a.items() if k not in ("protokoll", "protokoll_lauf")}, hat_protokoll=bool(a.get("protokoll")))
               for a in CFG.get("agenten", [])]
    return {"titel": CFG.get("titel", "Maschinenraum"), "rechner": RECHNER, "benutzer": BENUTZER,
            "check_titel": CFG.get("check_titel", "SYSTEM-CHECK"), "prefixe": list(PREFIXE), "portal": CFG.get("portal"),
            "welt": welt, "agenten": agenten}


# ── HTTP ──────────────────────────────────────────────────
WEB = os.path.join(HERE, "web")
STATISCH = {"/": "index.html"}
TYPEN = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
         ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml"}


def bibliotheken_liste():
    """Dateinamen aus web/bibliothek und privat/bibliothek, ohne Pfade. Die Seite schaltet damit das Aussehen um."""
    namen, gesehen = [], set()
    for ordner in (os.path.join(WEB, "bibliothek"), os.path.join(PRIVAT, "bibliothek")):
        if not os.path.isdir(ordner):
            continue
        for f in sorted(os.listdir(ordner), key=str.lower):
            stamm, ext = os.path.splitext(f)
            if ext != ".js" or not re.fullmatch(r"[A-Za-z0-9_-]+", stamm) or stamm in gesehen:
                continue
            gesehen.add(stamm)
            namen.append(stamm)
    return namen


def statische_datei(p):
    """Nur Dateien aus web/ – eigene Bibliotheken dürfen auch in privat/bibliothek/ liegen. Nichts anderes aus dem Ordner."""
    rel = STATISCH.get(p, p.lstrip("/"))
    if not rel or ".." in rel.split("/"):
        return None
    orte = [(WEB, rel)]
    if rel.startswith("bibliothek/"):
        orte.insert(0, (os.path.join(PRIVAT, "bibliothek"), rel[len("bibliothek/"):]))
    for basis, teil in orte:
        f = os.path.realpath(os.path.join(basis, teil))
        if f.startswith(os.path.realpath(basis) + os.sep) and os.path.isfile(f):
            return f
    return None


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def antwort(self, daten, code=200):
        b = json.dumps(daten, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def datei(self, f):
        with open(f, "rb") as fh:
            b = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", TYPEN.get(os.path.splitext(f)[1], "application/octet-stream"))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        # Bedienung nur von der eigenen Seite (eigener Kopf schützt vor fremden Formularen/Seiten)
        if self.path not in ("/api/aktion", "/api/mutter", "/api/auftraege", "/api/fall") or self.headers.get("X-Maschinenraum") != "1":
            self.send_error(403)
            return
        try:
            d = json.loads(self.rfile.read(min(int(self.headers.get("Content-Length", 0)), 16384)) or b"{}")
            if self.path == "/api/fall":
                return self.antwort(fall_api(d))
            if self.path == "/api/mutter":
                return self.antwort(mutter_fragen(str(d.get("nachricht", ""))[:4000], bool(d.get("neu"))))
            if self.path == "/api/auftraege":
                liste = json_datei(AUFTRAEGE, [])
                if d.get("text"):
                    liste.append({"id": int(time.time() * 1000), "text": str(d["text"])[:4000], "angelegt": iso(time.time()), "status": "offen"})
                elif d.get("id") and d.get("status") in ("offen", "erledigt", "geloescht"):
                    for a in liste:
                        if a["id"] == d["id"]:
                            a["status"] = d["status"]
                    liste = [a for a in liste if a["status"] != "geloescht"]
                json_schreiben(AUFTRAEGE, liste)
                return self.antwort({"ok": True, "auftraege": liste})
            if DEMO and self.path in ("/api/aktion", "/api/fall", "/api/mutter"):
                return self.antwort({"ok": False, "meldung": "Demo-Modus: hier wird nichts ausgeführt.", "antwort": "Demo-Modus: Mutter antwortet erst mit echter Konfiguration."})
            if d.get("aktion") == "freigabe":
                return self.antwort(freigabe(str(d.get("label", ""))))
            self.antwort(aktion(str(d.get("label", "")), str(d.get("aktion", ""))))
        except Exception as e:
            self.antwort({"ok": False, "meldung": f"Fehler: {e}"}, 500)

    def do_GET(self):
        u = urlparse(self.path)
        p, q = u.path, parse_qs(u.query)
        if p == "/api/config":
            return self.antwort(seiten_config())
        if p == "/api/bibliotheken":
            return self.antwort({"bibliotheken": bibliotheken_liste()})
        if p == "/api/status":
            return self.antwort(demo_status() if DEMO else json_datei(os.path.join(DATEN, "status.json"), {}))
        if p == "/api/plugin":
            return self.antwort(plugin_abfragen((q.get("name") or [""])[0]))
        if p == "/api/protokoll":
            return self.antwort(protokoll((q.get("bot") or [""])[0]))
        if p == "/api/faelle":
            return self.antwort({"faelle": json_datei(FAELLE_DATEI, {})})
        if p == "/api/auftraege":
            return self.antwort({"auftraege": json_datei(AUFTRAEGE, [])})
        if p == "/api/log":
            label = (q.get("label") or [""])[0]
            f, pl = plist_von(label)
            if not f or not eigen(label):
                return self.send_error(404)
            z = zustand(label)
            logs = log_ende(pl)
            return self.antwort({"label": label, "zustand": z, "deaktiviert": label in deaktivierte(), "logs": logs,
                                 "diagnose": diagnose(z["code"], logs) if z["code"] not in (0, None) else None})
        f = statische_datei(p)
        if not f:
            return self.send_error(404)
        self.datei(f)


if __name__ == "__main__":
    KERN = {"zustand": zustand, "iso": iso, "schwaerzen": schwaerzen, "pfad": pfad, "cfg": CFG}
    plugins_laden()
    if not DEMO:
        threading.Thread(target=sammler, daemon=True).start()
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as srv:
        print(time.strftime("%d.%m.%Y %H:%M:%S"), f"Maschinenraum läuft auf 127.0.0.1:{PORT}{' · DEMO' if DEMO else ''} · Konfiguration {os.path.relpath(CFG_PFAD, HERE)} · Plugins: {', '.join(PLUGINS) or '–'}", flush=True)
        srv.serve_forever()
