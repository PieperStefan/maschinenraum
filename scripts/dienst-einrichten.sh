#!/bin/bash
# Richtet den Maschinenraum als LaunchAgent ein: Start beim Anmelden, Neustart nach Absturz.
# Aufruf: scripts/dienst-einrichten.sh [label]   (Standard-Label: local.maschinenraum)
# Das Label sollte zu "eigenes_label" in der Konfiguration passen – dann kann sich der Maschinenraum nicht selbst abschalten.
set -e
LABEL="${1:-local.maschinenraum}"
D="$(cd "$(dirname "$0")/.." && pwd)"
P="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/Logs"
cat > "$P" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$D/start.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/maschinenraum.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/maschinenraum.log</string>
</dict>
</plist>
PLIST
plutil -lint "$P"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$P"
echo "Eingerichtet: $LABEL → http://127.0.0.1:$(python3 -c "import json,os;p='$D/privat/config.json';print(json.load(open(p if os.path.exists(p) else '$D/config.example.json')).get('port',8790))")"
