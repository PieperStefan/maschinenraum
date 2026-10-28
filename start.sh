#!/bin/bash
# Maschinenraum starten (von Hand oder aus einem LaunchAgent, siehe scripts/dienst-einrichten.sh).
cd "$(dirname "$0")"
# launchd erlaubt nur 256 offene Dateien – zu wenig für die Claude-Aufrufe (Mutter, Sekretariat, Arzt)
ulimit -n 65536
exec /usr/bin/python3 "$(pwd)/server.py"
