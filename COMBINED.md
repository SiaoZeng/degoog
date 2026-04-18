# degoog + SearXNG: Combined Deployment

## Überblick

Self-hosted Search-Stack: **degoog** (Bun/TypeScript UI) + **SearXNG** (Python, 242+ Engines) in einem Docker-Container. Dazu CLI-Tool `dg` und Claude Code Skill `web-search-dgstyle`.

## Repos

| Repo | Zweck | URL |
|---|---|---|
| **degoog Fork** | Combined Container (degoog + SearXNG) | https://github.com/SiaoZeng/degoog |
| **Store Extension** | SearXNG Engine für degoog Store | https://github.com/SiaoZeng/degoog-searxng-extensions |
| **SearXNG Fork** | Upstream Fork (unmodifiziert) | https://github.com/SiaoZeng/searxng |
| Upstream degoog | Originalprojekt | https://github.com/fccview/degoog |
| Upstream SearXNG | Originalprojekt | https://github.com/searxng/searxng |

Lokale Klone: `~/gh/degoog/`, `~/gh/degoog-searxng-extensions/`, `~/gh/searxng/`

## Architektur (Combined Fork)

```
┌─────────────────────────────────────────┐
│  Docker Container (Port 8082)           │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ degoog (Bun) │──│ SearXNG Engine  │  │
│  │ UI + Plugins │  │ (Custom Engine) │  │
│  │ :8082        │  └────────┬────────┘  │
│  └──────────────┘           │           │
│                    JSON API │           │
│  ┌──────────────────────────▼────────┐  │
│  │ SearXNG (Python/Flask)            │  │
│  │ :8888 (intern, 127.0.0.1)        │  │
│  │ 242+ Engines (107 aktiv)         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

Process Management: **supervisord** startet beide Services.

## Fork-spezifische Dateien

| Datei | Zweck |
|---|---|
| `Dockerfile.combined` | Multi-Stage Build: Python 3.12 (SearXNG) + Bun (degoog) |
| `docker-compose.combined.yml` | One-Command Deploy, Port 8082 |
| `supervisord.conf` | Process Manager für degoog + SearXNG |
| `entrypoint.combined.sh` | Init: Managed-Asset-Sync, JSON-Format aktivieren, Engine-Aktivierung via Env |
| `combined/engines/` | SearXNG Engine-Familie für Web, Images, Videos und News |
| `combined/plugins/searxng-manager/` | Engine Manager Plugin (Web-UI, nur im Fork) |
| `combined/generate-engines.py` | Engine-Generator (nicht im Einsatz, Archiv) |
| `tools/dg` | CLI Search Tool (fish shell) |
| `searxng/settings.yml` | Lokale SearXNG-Config (nicht im Image, nur lokal) |
| `src/client/settings/engines-tab.ts` | Patch: Link zum SearXNG Manager in Engines-Tab |

## Store Extension (Upstream-kompatibel)

Nur die Engine (~110 LoC JS), ohne Plugin. Im degoog Store installierbar.

```
degoog-searxng-extensions/
├── package.json          # Store-Manifest
├── engines/searxng/
│   ├── index.js          # SearXNG Engine
│   └── author.json
└── README.md
```

Installation: `Settings > Store > URL eintragen > Install`

### Upstream-Feedback & Lessons Learned

Discussion: https://github.com/fccview/degoog/discussions/48

**Fehler gemacht:** Ganzes Deployment-Paket (Dockerfile, supervisord, entrypoint, Frontend-Patch) als PR vorgeschlagen. War out of scope für upstream.

**Was upstream wollte:** Eine einzige Engine-Datei im Store-Format (~110 LoC).

**Fixes nach Feedback:**
1. `outgoingHosts: ["*"]` statt `["localhost"]` — beliebige SearXNG-URLs
2. Manager Plugin entfernt — redundant (Engine hat comma-separated Settings) + Sicherheitslücke (unauthenticated auf public instances)
3. `process.env` entfernt — Plugins können keine Env-Vars lesen

**Wichtige Trennung:** Diese Punkte gelten für die **Store-Extension**. Der **Combined-Fork** ist bewusst lokal-first und nutzt die interne SearXNG-Instanz im selben Container statt einer frei konfigurierbaren Remote-URL.

**Ergebnis:** Store-Repo wird in degoog's README aufgenommen.

## Ports

| Port | Bind | Service | Notizen |
|---|---|---|---|
| 8082 | 127.0.0.1 + Tailscale DNAT | degoog UI | Exposed |
| 8888 | 127.0.0.1 (intern) | SearXNG API | Container-intern |

## Container Management

```fish
# Start
cd ~/gh/degoog && docker compose -f docker-compose.combined.yml up -d

# Rebuild
docker compose -f docker-compose.combined.yml up -d --build

# Logs
docker logs degoog-degoog-1

# Stop
docker compose -f docker-compose.combined.yml down
```

Restart Policy: `unless-stopped` — startet automatisch nach Reboot.

## Build-Reproduzierbarkeit

`Dockerfile.combined` pinnt SearXNG auf Commit `e8299a4c37627c6271ed83227c27cf98021c03f6`, pinnt die Basis-Images per Digest und nutzt im Runtime-Image denselben Bun-Binary-Pfad wie der Build-Stage statt eines separaten Installer-Downloads.

## Env-Variablen

| Variable | Default | Beschreibung |
|---|---|---|
| `DEGOOG_PORT` | 8082 | degoog Frontend-Port |
| `SEARXNG_PORT` | 8888 | SearXNG interner Port |
| `SEARXNG_BIND_ADDRESS` | 127.0.0.1 | SearXNG Bind |
| `SEARXNG_SECRET` | degoog-searxng-local | Secret Key |
| `SEARXNG_IMAGE_PROXY` | true | Bilder über SearXNG proxyen |
| `SEARXNG_ENABLE_ENGINES` | huggingface,hackernews,... | Engines beim Start aktivieren |
| `PUID/PGID` | 1000 | Container User/Group |

## Zusätzlich aktivierte SearXNG Engines

Standard + diese 11:
- huggingface, huggingface datasets, huggingface spaces
- cachy os packages, hackernews, ollama
- crates.io, npm, gitlab, nixos wiki, wolframalpha

## CLI: `dg`

Installiert: `~/.local/bin/dg` (fish shell)

```fish
dg "query"                        # Standard (10 Ergebnisse)
dg -n 20 "deep topic"             # Mehr Ergebnisse
dg -t news "linux kernel"         # News
dg -s "CachyOS zen5"              # Nur SearXNG-Engines
dg -j "query" | jq '.results'     # JSON
dg -e "rust tokio"                # Engine-Timings
dg -l de "Datenschutz"            # Deutsch
dg -l zh-TW "台灣半導體"            # Taiwanesisch
```

## Claude Code Skill

`~/.claude/skills/web-search-dgstyle/SKILL.md`

Workflow: `dg` → URLs finden → Chrome DevTools MCP → gezielt Content extrahieren (spart Tokens vs. WebFetch).

## Engine-Verhalten

Der Combined-Fork registriert SearXNG als lokale Engine-Familie:
- `SearXNG` für Web/General
- `SearXNG Images`
- `SearXNG Videos`
- `SearXNG News`

Die Engine-Module sind **lokal-only** und lesen ihre Backend-URL nur aus loopback-basierten Combined-Deployment-Werten statt aus user-editierbaren Engine-Settings. Remote-SearXNG-URLs gehören in das separate Store-Extension-Repo, nicht in diesen Fork.

## Managed Asset Sync

`entrypoint.combined.sh` synchronisiert die fork-eigenen Engines und das `searxng-manager`-Plugin bei jedem Containerstart aus `/app/data-default/` nach `/app/data/`. Dadurch landen Fixes und neue Engine-Varianten auch in bestehenden Volumes, ohne dass ein einmaliger First-Run-Copy alte Assets festschreibt.

## Upstream-Sync

Dieser Fork ist ein **Overlay** auf degoog — alle Änderungen liegen in separaten Dateien. Upstream-Updates können konfliktfrei gemergt werden.

### Sync durchführen

```fish
cd ~/gh/degoog
git fetch upstream
git merge upstream/main
docker compose -f docker-compose.combined.yml up -d --build
```

### Konflikt-Risiko

| Datei | Typ | Konflikt bei Upstream-Update? |
|---|---|---|
| `COMBINED.md` | Neu | Nein — existiert upstream nicht |
| `Dockerfile.combined` | Neu | Nein |
| `docker-compose.combined.yml` | Neu | Nein |
| `supervisord.conf` | Neu | Nein |
| `entrypoint.combined.sh` | Neu | Nein |
| `combined/` | Neu | Nein |
| `tools/dg` | Neu | Nein |
| **`src/client/settings/engines-tab.ts`** | **Gepatcht** | **Möglich** — einziger Patch an upstream-Code |

Der einzige potenzielle Merge-Konflikt ist `engines-tab.ts` (SearXNG Manager Link am Ende der Funktion `initEnginesTab`). Falls upstream diese Datei ändert, muss der Link-Block manuell re-applied werden — ist ein 15-Zeilen Append, trivial zu lösen.

**Regel:** Eigene Änderungen immer in separaten Dateien halten. Patches an upstream-Code minimieren.

## SearXNG Engine Manager (nur im Fork)

URL: `http://127.0.0.1:8082/api/plugin/searxng-manager/`

Web-UI zum Toggling aller 250 SearXNG Engines. Kategorie-Filter, Suchfeld, Batch-Save mit Auto-Restart. Zugang über Settings > Engines > "Manage SearXNG Engines" Link.

**Hinweis:** Nur im Combined-Fork nutzbar (braucht Zugriff auf SearXNG settings.yml + supervisorctl). Nicht im Store-Extension enthalten wegen Sicherheitsbedenken (unauthenticated auf public instances).
