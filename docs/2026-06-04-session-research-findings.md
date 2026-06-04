# 2026-06-04 Session- und Research-Findings

## Status

- Dokumentstatus: Session-Evidenz und Research-Protokoll
- Branch: `port-combined-upstream`
- Branch-Head beim Schreiben dieses Dokuments: `c003f083f9ccf01e02beaa6910a0e439b5125656`
- Upstream-Basis: `upstream/main` von `https://github.com/fccview/degoog.git`, Version `0.19.1`
- Verifizierte Fork-Remotes:
  - GitHub: `https://github.com/SiaoZeng/degoog.git`
  - Forgejo: `leyox101-forgejo:jan.admin/degoog.git`
- Der aktuell laufende lokale degoog-Container wurde in dieser Session **nicht** ersetzt.

## Kurzfazit

Diese Session hatte drei zusammenhängende Untersuchungs- und Implementierungsstränge:

1. Die lokale TTS-Installation auf dem Host ist **Qwen3-TTS**. Sie läuft als persistenter User-Service auf Port `8007` und wird über `/home/jan/.local/bin/tts-say` angesprochen. Service, Modell und Build-Zustand wurden geprüft; aktuell ist weder ein Modellupdate noch ein Rebuild erforderlich.
2. Für zukünftige OMP-Agenten wurde ein globaler OMP-Skill `tts-say` angelegt. Er dokumentiert den sicheren Aufrufpfad, insbesondere Textübergabe per Environment-Variable statt Shell-Interpolation.
3. Der lokale `degoog`-Fork wurde gegen den Original-Upstream geprüft. Der alte Fork enthielt die lokale Combined-Docker/SearXNG/`dg`-Integration, war aber funktional auf `0.10.0`-Basis, während Upstream bei `0.19.1` stand. Deshalb wurde kein direkter Merge gemacht. Stattdessen wurde ein neuer Branch von Upstream `0.19.1` erstellt und die lokale Combined-Integration gezielt nach vorne portiert.

Wichtige operative Schlussfolgerung: Der neue Branch enthält wieder die gewünschte integrierte degoog+SearXNG-Docker-Variante, aber der laufende Host-Service kommt weiterhin aus dem alten Checkout unter `/home/jan/gh/degoog`. Der Cutover ist bewusst noch nicht erfolgt und bleibt ein separater operativer Schritt.

## Evidenz-Ledger

### Lokale Artefakte und Konfiguration

- Globale Host-Instruktionen waren über `/home/jan/AGENTS.md` im Kontext.
- Port-Registry `/home/jan/PORTS.md` wurde vor Docker-/Port-Aussagen geprüft.
- TTS-User-Service: `/home/jan/.config/systemd/user/tts-server.service`.
- TTS-CLI: `/home/jan/.local/bin/tts-say`.
- TTS-Source-Checkout: `/home/jan/gh/qwen3-tts.cpp`.
- TTS-Runtime-Verzeichnis: `/home/jan/.local/share/qwen3-tts`.
- OMP-Skill-Pfad wurde über OMP-Doku und OMP-Discovery-Code verifiziert: `/home/jan/.omp/agent/skills/<skill>/SKILL.md`.
- Angelegter OMP-Skill: `/home/jan/.omp/agent/skills/tts-say/SKILL.md`.
- Alter degoog-Checkout: `/home/jan/gh/degoog`.
- Neuer degoog-Worktree: `/home/jan/.omp/agent/worktrees/degoog/port-combined-upstream`.

### Git-Evidenz

Alter lokaler `degoog`-Fork gegen Original-Upstream:

```text
HEAD...upstream/main: 6 lokale Commits ahead, 396 Upstream-Commits ahead
lokales describe: 0.10.0-6-g715bca8
upstream describe: 0.19.1
upstream diff: 447 files changed, 32020 insertions(+), 17288 deletions(-)
```

Neuer Upstream-Port-Branch:

```text
branch: port-combined-upstream
head: c003f083f9ccf01e02beaa6910a0e439b5125656
HEAD...upstream/main: 1 ahead, 0 behind
HEAD...origin/port-combined-upstream: 0 ahead, 0 behind
HEAD...forgejo/port-combined-upstream: 0 ahead, 0 behind
```

Gepushte Ziele:

- GitHub-Branch: `https://github.com/SiaoZeng/degoog/tree/port-combined-upstream`
- Forgejo-Compare/PR-URL: `https://leyox101.tailf46ea8.ts.net/jan.admin/degoog/compare/main...port-combined-upstream`

### Verifizierungs-Evidenz aus der Session

TTS:

```text
systemctl --user show tts-server.service:
ActiveState=active
SubState=running
ExecMainStatus=0
ExecMainStartTimestamp=Tue 2026-06-02 21:10:54 CST

http://127.0.0.1:8007/health:
{ "status": "ok", "busy": false, "queue": 0 }

/home/jan/.local/bin/tts-say --list-voices:
pem
lina
```

Aktuell laufender alter degoog-Container:

```text
docker ps --filter name=degoog:
degoog-degoog-1, image degoog-degoog, Up 2 days, 127.0.0.1:8082->8082/tcp
```

Alter laufender degoog-Endpunkt:

```text
GET http://127.0.0.1:8082/api/search?q=degoog&type=all&page=1
lieferte Suchergebnisse mit Quellen u.a. DuckDuckGo, Brave Search und SearXNG.
```

Code-Verifikation des neuen Branches vor diesem Dokument:

```text
bun run typecheck: OK
bun test tests/routes/settings-auth.test.ts tests/routes/searxng-manager.test.ts tests/routes/plugin-routes.test.ts tests/engines/searxng-engine.test.ts tests/engines/registry.test.ts tests/extensions/plugin-routes-resolve.test.ts tests/routes/extensions.test.ts: 14 pass
bun run build: OK
docker build -f Dockerfile.combined -t degoog-combined-upstream-test:latest .: OK
```

Docker-Smoke-Tests des neuen Branches:

```text
/readyz: OK
SearXNG /config: OK
SearXNG Manager: 251 Engines, 31 Kategorien
SearXNG Manager Toggle Endpoint: Engine-Toggle erfolgreich, SearXNG-Neustart über supervisorctl erfolgreich
/api/search mit searxng-engine: Ergebnisse erhalten
DEGOOG_BASE_URL=/base Smoke: /base/api/plugin/searxng-manager/engines liefert Manager-Daten
```

CLI-Kompatibilität:

```text
/home/jan/.local/bin/dg -n 3 degoog
lieferte 3 Ergebnisse gegen den aktuell laufenden alten Container.

/home/jan/.local/bin/dg -n '1;__import__("os").system("false")' degoog
lieferte: Error: --count must be a positive integer
```

## TTS-Findings

### Installiertes System

Die lokale TTS-Installation ist **Qwen3-TTS**. Es handelt sich nicht um eine generische Python-TTS-Installation. Der User-Service liegt hier:

```text
/home/jan/.config/systemd/user/tts-server.service
```

Die Service-Beschreibung lautet:

```text
Qwen3-TTS Persistent Server (ONNX-free, GGML Vulkan, Q8_0)
```

Der Service startet:

```text
/home/jan/.local/share/qwen3-tts/bin/qwen3-tts-server \
  -m /home/jan/.local/share/qwen3-tts/models \
  -v /home/jan/.local/share/qwen3-tts/voices \
  -p 8007 \
  -j 8
```

Festgestellte Runtime-Daten:

- Server-Port: `8007`
- CLI-Wrapper: `/home/jan/.local/bin/tts-say`
- Runtime-Root: `/home/jan/.local/share/qwen3-tts`
- Source-Checkout: `/home/jan/gh/qwen3-tts.cpp`
- Default-Voice im Skill-Kontrakt: `lina`
- Default-Language im Skill-Kontrakt: `de`
- beobachtete Voices: `pem`, `lina`

### Modell- und Build-Zustand

Das lokal installierte Modell ist:

```text
Qwen/Qwen3-TTS-12Hz-0.6B-Base
```

Die Prüfung der lokalen HuggingFace-Metadaten gegen die HuggingFace-API zeigte, dass die lokale Modellrevision zur geprüften API-Revision passte. Im Source-Repo `qwen3-tts.cpp` waren upstream-seitig Commits vorhanden, aber der lokale Build baute sauber und der laufende GGML/Vulkan/Q8_0-Pfad war funktionsfähig. Deshalb wurde kein Modellupdate, kein Rebuild und kein Service-Restart durchgeführt.

### Operative TTS-Entscheidung

Der richtige normale Aufrufpfad ist die CLI, nicht ein direkter HTTP-Call:

```bash
/home/jan/.local/bin/tts-say "$TTS_TEXT"
```

Der zu sprechende Text soll über eine Environment-Variable übergeben werden. Agenten sollen keine User-Texte direkt in Shell-Source interpolieren. Das reduziert Quoting-Fehler und verhindert, dass gesprochene Nutzereingaben unbeabsichtigt Shell-Syntax werden.

### Globaler OMP-Skill `tts-say`

Der globale OMP-Skill wurde angelegt unter:

```text
/home/jan/.omp/agent/skills/tts-say/SKILL.md
```

Wichtig: der korrekte globale OMP-Skill-Pfad ist **nicht** opencode und nicht `.pi`, sondern:

```text
/home/jan/.omp/agent/skills
```

Der Skill dokumentiert verbindlich:

- `/home/jan/.local/bin/tts-say` verwenden
- Text per `TTS_TEXT` übergeben
- endlichen Timeout verwenden, typischerweise `180` Sekunden
- kein direktes `curl` für normale Synthese verwenden
- Qwen3-TTS nicht für einfache Speak-Requests updaten, rebuilden, restarten oder reconfigurieren
- keine Secrets, Tokens, Private Keys, Gesundheitsdaten, Finanzdaten oder exakten Adressen sprechen, außer der User verlangt explizit genau das

## Research-Skill-Findings

Da `dg` durch OMP-Webresearch-Flows verwendet wird, wurden die relevanten Research-Skills untersucht.

### `dg-webresearch`

`dg-webresearch` ist ein Discovery-Skill, kein Synthese-Skill.

Festgestellte Regeln:

- `quickresearch`: bis zu 3 Kandidaten
- `research`: bis zu 5 Kandidaten
- vorgesehene Discovery-Form: `dg -j -n <N> "query"`
- Snippets allein reichen nicht für faktische Aussagen
- ausgewählte Quellen müssen danach per OMP-Tooling, `deep-research` oder `browser-research` tatsächlich gefetcht und belegt werden

### `deep-research`

`deep-research` ist der mittlere Multi-Source-Synthese-Workflow.

Festgestellte Regeln:

- Discovery-Pool: bis zu 20 Kandidaten total
- finale Synthese: beste 6 Quellen
- synthetisiert werden nur die final ausgewählten Quellen, nicht alle Kandidaten
- Browser-Eskalation nur, wenn günstigere Fetch-Pfade nicht ausreichen

### `deepdeepresearch`

`deepdeepresearch` ist der breiteste Research-Modus.

Festgestellte Regeln:

- Discovery-Pool: bis zu 50 Kandidaten total
- finale Synthese: beste 10 Quellen
- finale Quellen sollen mindestens 4 Perspektivtypen abdecken, wenn das Thema das hergibt
- Perspektivtypen: Primärquelle, empirisch/operativ, Sekundäranalyse, Gegenbeweis/Dissens, Kontext/Hintergrund, angewandt/Practitioner
- wenn weniger als 10 starke Quellen oder weniger als 4 Perspektiven verfügbar sind, soll das explizit dokumentiert werden; keine schwachen Quellen zum Auffüllen verwenden

### Tool-Policy-Hinweis

Die Research-Skilltexte enthalten noch Legacy-Beispiele mit CLI-Tools wie `curl`, `grep`, `head`, `sed` und `awk`. Im OMP-Harness gelten dafür spezialisierte Tools:

- URL/Page-Fetch: `read(<url>)`
- Content-Suche: `search`
- Dateisuche: `find`
- Dateilesen: `read`

Die CLI-Beispiele sind daher als host-lokale Fallback-Muster zu behandeln, nicht als bevorzugter OMP-Pfad.

## degoog-Findings

### Alter lokaler Fork

Der alte Checkout liegt hier:

```text
/home/jan/gh/degoog
```

Er hat die Remotes:

- `origin`: GitHub-Fork
- `forgejo`: Forgejo-Fork
- `upstream`: Original-Upstream

Zu Beginn der degoog-Arbeit war der lokale Fork vor GitHub. Der Stand wurde ohne Force-Push nach GitHub gepusht. Danach entsprachen GitHub- und Forgejo-`main` dem alten lokalen Fork-Head `715bca8...`.

Der alte Fork basierte aber faktisch auf `0.10.0` plus lokaler Combined-Docker/SearXNG/`dg`-Arbeit. Original-Upstream war inzwischen bei `0.19.1`.

### Was Upstream hatte, aber der alte Fork nicht

Die wichtigsten upstream-seitigen Neuerungen, die im alten Fork fehlten:

1. Extension-/Plugin-Architektur
   - kanonische Extension-IDs
   - Migrationen für Extension-Identitäten
   - Store-/Repo-Operation-Refactors
   - Plugin-Docs/README-Anzeige
   - Indikatoren für externen Netzwerkzugriff
   - Middleware-/Interceptor-Plugin-Typen
   - Search-Bar- und Search-Result-Tab-Extensions

2. Transport-Layer
   - Custom Transports in `data/transports`
   - Built-ins: `fetch`, `curl`, `curl-impersonate`, `auto`
   - per-engine Transport-/Proxy-Konfiguration
   - Docker-Unterstützung für `curl-impersonate`

3. Search-UX/API
   - Streaming Search Endpoint: `/api/search/stream`
   - Search Tabs und Tab-Reihenfolge
   - Multi-Type Search
   - Trailing Bangs
   - POST Search Support
   - Autocomplete-/Suggestions-Änderungen
   - Domain-Block-/Replace-/Score-Regeln
   - Image-/Media-Fixes
   - Tracker-Parameter-Cleanup

4. Security/Public-Instance-Hardening
   - API-Key Guards für Search/Suggest
   - Settings Auth über Token/Passwort
   - Honeypot-Routen
   - Bot-Trap/Blocklist
   - getrennte Search-/Suggest-Rate-Limits
   - signed image proxy / Proxy-Verbesserungen

5. Settings UI
   - Settings Search
   - Server Tab
   - Proxy Test
   - Autocomplete Tab
   - Transports Tab
   - Store-UI-Refactors
   - verbesserte Engine-Seite
   - Auto-Save-/Server-Settings-Änderungen

6. Built-in Commands und Lokalisierung
   - Built-ins wie `at-a-glance`, `help`, `ip`, `speedtest`, `uuid`, `wikipedia`
   - zusätzliche Locales und RTL-Support
   - Translation-Fallbacks und Circuit-Logik

7. Deployment
   - Upstream-Image-Naming unter `ghcr.io/degoog-org/degoog`
   - Healthcheck gegen `/readyz`
   - optionaler Valkey/Redis Shared Cache
   - `su-exec` statt `gosu`
   - Podman Quadlet Dokumentation
   - neues Docs-Ziel unter `https://degoog-org.github.io/docs`

### Was der alte Fork hatte, aber Upstream nicht

Die lokalen Fork-Features, die Upstream nicht enthielt:

- `tools/dg`
- `Dockerfile.combined`
- `docker-compose.combined.yml`
- `entrypoint.combined.sh`
- `supervisord.conf`
- `COMBINED.md`
- `combined/engines/searxng*`
- `combined/plugins/searxng-manager`

Diese Dateien implementieren das lokal gewünschte Deployment-Modell: ein degoog-facing Docker-Container, in dem SearXNG intern mitläuft.

### Porting-Entscheidung

Ein direkter Merge von Upstream in den alten Fork wurde verworfen, weil die Merge-Simulation viele Konflikte zeigte und weil Upstream genau Bereiche stark verändert oder gelöscht hatte, in denen die lokale Combined-Integration lag.

Der gewählte sichere Pfad:

1. neuen Branch von `upstream/main` erstellen
2. lokale Combined-Integration gezielt portieren
3. Upstreams neue Auth-/Search-/Extension-Architektur behalten
4. nur die lokalen Combined-Docker/SearXNG/`dg`-Capabilities wieder einbauen

Resultierender Branch:

```text
port-combined-upstream
```

## Auth-Entscheidung

Upstream verwendet für Settings-Auth thematische Helfernamen wie `gandalf` und `canBalrogPass`. Der alte lokale SearXNG-Manager nutzte klarere Namen und ältere Auth-Logik.

Die Entscheidung war:

- Upstreams neue Auth-Implementierung behalten
- alte Token-Map-/Password-Logik nicht wiederherstellen
- deskriptive Alias-Exports hinzufügen
- SearXNG-Manager gegen diese Alias-Exports portieren

Begründung:

- Upstreams Auth hat besseres Public-Instance-Verhalten
- Upstreams Auth hat sauberere Cookie-Behandlung
- Tokenverwaltung und Helferlogik sind besser getrennt
- alte Auth zusätzlich zurückzubringen würde zwei Auth-Systeme schaffen und inkonsistente Autorisierung riskieren

Gewünschtes Importmuster für neuen Code:

```ts
getSettingsAuthToken(...)
validateSettingsAuthToken(...)
```

statt direkter Imports thematischer Namen.

## Implementierter Branch-Inhalt

Wichtige neu hinzugefügte oder geänderte Dateien:

```text
COMBINED.md
Dockerfile.combined
docker-compose.combined.yml
entrypoint.combined.sh
supervisord.conf
tools/dg
combined/engines/_shared/searxng-base.ts
combined/engines/searxng/index.ts
combined/engines/searxng-images/index.ts
combined/engines/searxng-news/index.ts
combined/engines/searxng-videos/index.ts
combined/plugins/searxng-manager/index.ts
combined/plugins/searxng-manager/page.html
src/client/settings/engines-tab.ts
src/server/routes/plugin-routes.ts
src/server/routes/settings-auth.ts
tests/engines/searxng-engine.test.ts
tests/routes/plugin-routes.test.ts
tests/routes/searxng-manager.test.ts
tests/routes/settings-auth.test.ts
```

### Combined-Docker-Modell

Der neue Branch implementiert das gewünschte Integrationsmodell:

- ein Docker-Container
- degoog extern auf Port `8082`
- SearXNG intern auf `127.0.0.1:8888`
- `supervisord` verwaltet beide Prozesse
- nur degoog wird nach außen exponiert
- SearXNG wird über degoog Engines und Manager Plugin verwendet

SearXNG wird absichtlich nicht als separater Host-Service exponiert.

### SearXNG Engines

Der Branch fügt folgende upstream-kompatible Engine-IDs hinzu:

```text
searxng-engine
searxng-images-engine
searxng-videos-engine
searxng-news-engine
```

Die Engines verwenden eine gemeinsame SearXNG-Basis und mappen degoog Engine Calls auf die SearXNG JSON API.

### SearXNG Manager

Der Manager liegt unter:

```text
/api/plugin/searxng-manager/
```

Er liest den SearXNG `/config`-Endpunkt, listet verfügbare Engines/Kategorien, schreibt exakte Engine-Toggles in `settings.yml` und startet SearXNG über `supervisorctl` neu.

Review-getriebene Härtungen:

- exaktes YAML-Engine-Block-Matching statt breitem Regex-Rewrite
- explizite Erkennung unbekannter angefragter Engines
- `execFile("supervisorctl", [...])` mit fixen Argumenten statt Shell-Ausführung
- Supervisor-Control-Socket in `supervisord.conf`
- base-path-sichere Manager-Page-URLs
- base-path-sichere Plugin-Route-Suffix-Ermittlung

### `dg` CLI

Die CLI wurde im Branch und host-lokal installiert aktualisiert.

Installierter Pfad:

```text
/home/jan/.local/bin/dg
```

Branch-Pfad:

```text
tools/dg
```

Wichtiges Verhalten nach der Session:

- Default Search Type ist `web` für Upstream `0.19.1`
- wenn der alte lokale degoog-Container bei `type=web` eine leere Legacy-Antwort liefert, retryt `dg` automatisch mit `type=all`
- `--count` und `--page` müssen positive Integer sein
- Query-Text wird für URL-Encoding als Python-ARGV-Daten übergeben, nicht in Python-Source interpoliert
- formatierter Output und JSON-Modus bleiben erhalten

Damit funktioniert der installierte `dg` gegen beide Zielsysteme:

- aktuell laufender alter lokaler Container
- neues `port-combined-upstream` Docker Image

## Code-Review-Findings und Auflösungen

Eine unabhängige Review fand mehrere wichtige bzw. blockierende Punkte. Sie wurden geprüft und behoben.

### Finding: fehlende Runtime-Libraries in `Dockerfile.combined`

Auswirkung: Upstreams Bun-Image konnte native Runtime-Libraries implizit, aber nicht explizit abgesichert haben.

Auflösung:

- `libgcc` und `libstdc++` wurden im Runtime-Stage-Paketset ergänzt

### Finding: SearXNG-Manager YAML-Toggle war zu unscharf

Auswirkung: breiter Regex-Rewrite konnte falsche Engines ändern oder scheitern, wenn `disabled` fehlte.

Auflösung:

- `applySearXNGEngineToggles()` hinzugefügt
- exaktes Matching über `- name:`-Blöcke
- Regressionstest für exaktes Matching und Einfügen fehlender `disabled`-Keys

### Finding: `supervisorctl restart` war nicht nutzbar konfiguriert

Auswirkung: Restart hätte ohne Supervisor-Control-Interface fehlschlagen können.

Auflösung:

- `unix_http_server`, `rpcinterface:supervisor` und `supervisorctl` in `supervisord.conf` ergänzt
- Manager nutzt `execFile` mit fixen Args und Timeout

### Finding: `dg` Default und Quoting waren nicht robust genug

Auswirkung: alte CLI ging von `type=all` aus; der neue Branch brauchte `type=web`; außerdem durfte User Input nicht in Python-Code interpoliert werden.

Auflösung:

- Default auf `web`
- Legacy-Fallback auf `all`
- numerische Argumentvalidierung
- Query/Flags als Daten statt Source-Interpolation

### Finding: Plugin Routes unter Base Path defekt

Auswirkung: Wenn degoog unter `DEGOOG_BASE_URL` gemountet wird, konnte der Manager-Plugin-Suffix fälschlich als `/` aufgelöst werden.

Auflösung:

- Suffix-Ableitung nutzt jetzt `c.req.path` und `c.req.routePath`
- Regressionstest für Router-Mount unter `/base`
- Smoke-Test mit `DEGOOG_BASE_URL=/base`

### Finaler Review-Status

Die finale Re-Review nach den Fixes meldete keine verbleibenden blockierenden oder wichtigen Findings im erneut geprüften Scope.

## Aktueller Deployment-Zustand

Der laufende Host-Service wurde nach Erstellung dieses Dokuments am `2026-06-05` auf den Branch `deploy-combined-upstream` umgestellt. Dieser Branch folgt `origin/port-combined-upstream`.

Deploy-Checkout:

```text
/home/jan/gh/degoog
branch: deploy-combined-upstream
head beim Recreate: a58564b0c101fa35f56486ebd5bbf623e5653aa9
```

Vor dem Cutover wurde das persistente Datenverzeichnis gesichert:

```text
/home/jan/tmp/degoog-data-backup-20260605-010440
```

Beobachteter Container nach Recreate:

```text
name: degoog-degoog-1
image: degoog-degoog
status: Up, healthy
ports: 127.0.0.1:8082->8082/tcp
container id prefix: dfb5e34167f5
```

Verifizierte Endpunkte nach Recreate:

```text
GET http://127.0.0.1:8082/readyz
=> {\"ok\":true}

GET http://127.0.0.1:8082/api/extensions
=> SearXNG engine IDs vorhanden: searxng-engine, searxng-images-engine, searxng-videos-engine, searxng-news-engine

GET http://127.0.0.1:8082/api/plugin/searxng-manager/engines
=> 251 Engines, 31 Kategorien

GET http://127.0.0.1:8082/api/search?q=degoog&type=web&engines=searxng-engine
=> 32 Ergebnisse, EngineTiming: SearXNG status ok
```

`dg` wurde nach dem Cutover gegen den neu erstellten Container verifiziert:

```text
/home/jan/.local/bin/dg -n 3 degoog
=> 3 Ergebnisse

/home/jan/.local/bin/dg -j -n 2 degoog
=> JSON-Ausgabe mit SearXNG-Ergebnissen
```

## Cutover-Hinweise

Der Cutover wurde am `2026-06-05` durchgeführt. Die folgenden Punkte bleiben für spätere Recreates oder Rollbacks relevant.

### Checks vor einem erneuten Recreate

1. Prüfen, dass `/home/jan/gh/degoog` auf `deploy-combined-upstream` oder einem bewusst gewählten Nachfolgebranch steht.
2. Prüfen, dass `/home/jan/PORTS.md` weiterhin `8082` für degoog reserviert und `8888` nur als interne SearXNG-Adresse behandelt.
3. Vor `docker compose up --build --force-recreate` ein Backup von `/home/jan/gh/degoog/data` erstellen.
4. Nach dem Recreate verifizieren:
   - `/readyz`
   - `/api/extensions`
   - `/api/plugin/searxng-manager/engines`
   - `/api/search?q=degoog&type=web&engines=searxng-engine`
   - `/home/jan/.local/bin/dg -n 3 degoog`

### Rollback-Ablauf auf hoher Ebene

Falls Cutover fehlschlägt:

1. neuen Compose-Service stoppen
2. alten Compose-Service aus `/home/jan/gh/degoog/docker-compose.combined.yml` starten
3. `/api/search?q=degoog&type=all&page=1` prüfen
4. `/home/jan/.local/bin/dg -n 3 degoog` prüfen

## Offene Entscheidungen

1. Ob `port-combined-upstream` in `main` auf GitHub und Forgejo gemergt werden soll.
2. Ob `/home/jan/gh/degoog` in-place aktualisiert oder durch einen neuen Checkout/Worktree für den laufenden Service ersetzt werden soll.
3. Ob `COMBINED.md` als Operator-Doku reicht oder nach Cutover in kleinere Dokumente aufgeteilt werden soll.
4. Ob die Research-Skill-Dokumente (`dg-webresearch`, `deep-research`, `deepdeepresearch`) bereinigt werden sollen, damit Legacy-CLI-Beispiele nicht gegen OMP-native Toolregeln drücken.

## Nicht erledigt / bewusst nicht gemacht

- Der laufende degoog-Docker-Service wurde nicht ersetzt.
- `main` wurde nach dem Upstream-Port nicht force-gepusht.
- Die alte Auth-Implementierung wurde nicht wiederhergestellt.
- SearXNG wurde nicht als separater Host-Service exponiert.
- TTS wurde nicht rebuildet oder neugestartet.
- Es wurden absichtlich keine Secrets in dieses Dokument geschrieben.
