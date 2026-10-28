[Deutsch](README.md) · **English**

![Views](https://komarev.com/ghpvc/?username=maschinenraum-repo&color=38bdf8&style=flat-square&label=views%20since%202026--10--28)

# Maschinenraum (“engine room”)

**A 3D control room for the background services of a Mac.** Every service (launchd LaunchAgent) becomes a small robot in a walkable spaceship office. Its body color shows the state: green = ok, yellow = running, red = error, grey = off. Click a robot to open its control panel: start, stop, pause, disable, read logs.

![Overview: office, lounge, engine room, secretariat and doctor's room](docs/gesamt.jpg)

> The user interface and the configuration field names are in **German**. This page and [AGENTS.en.md](AGENTS.en.md) explain everything in English.

## Features

- **Live state** of your own LaunchAgents: status, exit code, schedule, last and next run. Refreshed every minute.
- **Robots** are fully configurable: which jobs a robot watches, where it sits, what it does, which color it has.
- **Rooms as building blocks** (`raeume/*.json`): office, lounge, engine room, secretariat and doctor's room. Rooms can be added, moved, swapped or left out.
- **Swappable look** (`web/bibliothek/*.js`): furniture, walls, floors and robots come from a library. Load another library and the whole place looks different.
- **Control panel** per robot or job, with a plain-language diagnosis (e.g. “the program lacks Full Disk Access”) and a button that opens the right privacy settings.
- **Wall boards** with system check, all jobs, backups and open cases.
- **Plugins** (`plugins/*.py`): your own data sources for robots, e.g. a database or a web API.
- **With Claude Code** (optional, needs the [Claude Code CLI](https://docs.anthropic.com/claude-code)):
  - **“Mutter”**, the mainframe: chat about the current state, read-only. Tasks can be saved for later.
  - **Secretariat:** right-click a robot. Claude examines its scripts and logs (read-only) and makes 3 suggestions.
  - **Doctor:** pick a suggestion and Claude repairs the robot. It makes backups first, deletes nothing and never uses sudo. Then the job is restarted.

## Screenshots

| Office | Engine room | Secretariat & doctor |
|---|---|---|
| ![Office with robots at their desks and the system board](docs/buero.jpg) | ![Engine room with reactor, vault and backup board](docs/maschinenraum.jpg) | ![Secretariat and doctor's room for fault analysis](docs/sekretariat.jpg) |

## Quick start

Requirement: macOS with the built-in `/usr/bin/python3`. No packages to install. The page loads three.js from the jsDelivr CDN.

```bash
git clone https://github.com/<user>/maschinenraum.git && cd maschinenraum
./start.sh
```

Open `http://127.0.0.1:8790` and click the gear.

Without your own configuration, `config.example.json` is used. It shows every LaunchAgent that is not from Apple, plus a few example robots.

**Just looking, no real services:** `MR_DEMO=1 ./start.sh` shows made-up sample data. Nothing is executed in demo mode.

## Your own configuration

```bash
mkdir -p privat && cp config.example.json privat/config.json
```

Then edit `privat/config.json`. The folder `privat/` is **never** committed (see `.gitignore`), so everything personal belongs there:

| What | Where |
|---|---|
| Robots, jobs, backups, rules, links | `privat/config.json` |
| Your own data sources | `privat/plugins/*.py` |
| Your own rooms (override rooms with the same name) | `privat/raeume/*.json` |
| Your own libraries (look) | `privat/bibliothek/*.js` |
| Runtime data (status, cases, tasks) | `daten/` (created automatically) |

The complete field reference is in **[AGENTS.en.md](AGENTS.en.md)** (German original: [AGENTS.md](AGENTS.md)). It is written so you can hand it to an AI assistant: “Read AGENTS.en.md and add a robot for my backup job.”

## Run as a service

```bash
scripts/dienst-einrichten.sh local.maschinenraum
```

This starts the engine room at login and restarts it after a crash. Put the same label into `"eigenes_label"` in your configuration, so the engine room cannot switch itself off.

## Security

- The server only listens on `127.0.0.1`. To reach it from other devices, use something like `tailscale serve` (your own network only). **Do not expose it to the open internet**: the page can control services.
- Control commands (POST) are only accepted with the header `X-Maschinenraum: 1`, which only the page itself sends.
- Only LaunchAgents whose label matches `prefixe` can be controlled. Without a list, that means everything except Apple's own services.
- `status.json` contains no program arguments, environment variables or log contents. Logs are redacted when displayed (`password=…`, `token=…` etc.).
- **The doctor changes files.** For this, Claude gets `Edit`/`Write` in the folders of the affected service and a short list of allowed commands. `rm`, `sudo`, `launchctl bootout/disable`, `security` and web access are blocked. It only runs when you explicitly send it off with a suggestion.

## Layout

```
server.py              collector + HTTP server (Python 3.9, no dependencies)
start.sh               start script
config.example.json    example configuration
web/index.html         page
web/app.js             robots, live status, control panel, secretariat/doctor, Mutter
web/welt.js            builds the world from rooms + library, path finding
web/bibliothek/        look (standard.js = spaceship office)
raeume/                room templates (JSON)
plugins/               example plugin
scripts/               install as a LaunchAgent
docs/                  screenshots
AGENTS.md / .en.md     full reference (for people and AI)
```

## License

MIT, see [LICENSE](LICENSE).
