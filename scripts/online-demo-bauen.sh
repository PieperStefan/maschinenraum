#!/bin/bash
# Baut die Live-Demo für Cloudflare Pages nach online-demo/dist (Seite aus web/, Antworten aus online-demo/functions).
# Veröffentlichen z. B.: npx wrangler pages deploy online-demo/dist --project-name <name>
set -e
D="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$D/online-demo/dist" && mkdir -p "$D/online-demo/dist"
cp -R "$D/web/." "$D/online-demo/dist/"
cp -R "$D/online-demo/functions" "$D/online-demo/dist/functions"
echo "fertig: $D/online-demo/dist"
