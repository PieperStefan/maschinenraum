# Beispiel-Plugin für den Maschinenraum. Eigene Plugins gehören nach privat/plugins/ (nicht ins Repository).
# Ein Plugin ist eine Python-Datei mit einem Wörterbuch QUELLEN = {"name": funktion}.
# Die Funktion bekommt den Werkzeugkasten `kern` und gibt ein Ergebnis im Plugin-Format zurück (siehe AGENTS.md).
import subprocess, time


def laufzeit(kern):
    """Wie lange läuft der Rechner schon? Gelb ab 30 Tagen (ein Neustart wäre gut)."""
    out = subprocess.run(["sysctl", "-n", "kern.boottime"], capture_output=True, text=True, timeout=5).stdout
    try:
        start = int(out.split("sec =")[1].split(",")[0])
    except (IndexError, ValueError):
        return {"status": "err", "text": "Startzeit nicht lesbar"}
    tage = (time.time() - start) / 86400
    return {"status": "run" if tage > 30 else "ok", "text": f"läuft seit {tage:.1f} Tagen",
            "abschnitte": [{"titel": "Rechner", "zeilen": [{"status": "ok", "titel": "Gestartet", "text": kern["iso"](start)}]}]}


QUELLEN = {"beispiel_laufzeit": laufzeit}
