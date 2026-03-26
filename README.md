<p align="center">
  <img src="src/public/images/degoog-logo.png" alt="Degoog Logo" width="100"> 
  <br />
  <h1 align="center">degoog</h1><br/>
</p>

Search aggregator that queries multiple engines and shows results in one place. You can add custom search engines, bang-command plugins, and slot plugins (query-triggered panels above/below results or in the sidebar). The dream would be to eventually have a user made marketplace for plugins/engines.

**Still in beta.** Not intended for production use yet.

---

<p align="center">
  <a href="https://discord.gg/invite/mMuk2WzVZu">
    <img width="40" src="https://skills.syvixor.com/api/icons?i=discord">
  </a>
  <br />
  <i>Join our discord community</i>
  <br />
</p>

---

<div align="center">
  <img width="800" src="screenshots/home.png">
</div>

## Run

By default the app will run on port `4444`, please check the [documentation](https://fccview.github.io/degoog/env.html) for a comprehensive list of env variables and various nuances.

```bash
mkdir -p ./data
sudo chown -R 1000:1000 ./data
```

<details>
<summary>Docker Compose</summary>

```yaml
services:
  degoog:
    image: ghcr.io/fccview/degoog:latest
    volumes:
      - ./data:/app/data
    ports:
      - "4444:4444"
    restart: unless-stopped
```

</details>

<details>
<summary>Inline podman</summary>

```bash
podman run -d --name degoog -p 4444:4444 -v ./data:/app/data --user 1000:1000 --security-opt label=disable --restart unless-stopped ghcr.io/fccview/degoog:latest
```

</details>

<details>
<summary>Inline docker</summary>

```bash
docker run -d --name degoog -p 4444:4444 -v ./data:/app/data --user "1000:1000" --restart unless-stopped ghcr.io/fccview/degoog:latest
```

</details>

<details>
<summary>Run natively</summary>

You'll need a `.env` file for your env variables and the following required dependencies:

- [bun](https://bun.sh)
- [git](https://git-scm.com)

```bash
git clone https://github.com/fccview/degoog.git
cd degoog
bun install
bun run build
bun run start
```

**note**: If HTTPS requests fail with certificate errors, install the `ca-certificates` package

</details>

<details>
<summary>Proxmox VE Script</summary>

The community Proxmox script exists, but it is currently marked as in development and not recommended for production use:

https://proxmox-scripts.com/posts/degoog

</details>

<p align="center">
  <br />
  <a href="https://www.buymeacoffee.com/fccview">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" width="150">
  </a>
</p>

## Combined Mode: degoog + SearXNG

This fork adds a **combined deployment** that runs degoog and [SearXNG](https://github.com/searxng/searxng) in a single Docker container. SearXNG provides 242+ search engines as a headless API backend, while degoog serves as the frontend with its full plugin/theme/extension system.

### Architecture

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
│  │ :8888 (internal, 127.0.0.1)      │  │
│  │ 242+ Engines                      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Quick Start

```bash
git clone https://github.com/SiaoZeng/degoog.git
cd degoog
docker compose -f docker-compose.combined.yml up -d --build
# Open http://localhost:8082
```

### What's Included

| Component | Description |
|---|---|
| `data/engines/searxng/` | Custom SearXNG engine — connects degoog to SearXNG's JSON API |
| `data/plugins/searxng-manager/` | Engine Manager Plugin — toggle 242+ SearXNG engines from a web UI |
| `Dockerfile.combined` | Multi-stage build: Python (SearXNG) + Bun (degoog) in one container |
| `supervisord.conf` | Process manager for both services |
| `tools/dg` | CLI search tool (fish shell) for terminal-based queries |

### SearXNG Engine Manager

Access at `http://localhost:8082/api/plugin/searxng-manager/` — filter by category, search by name, toggle engines on/off with batch save and automatic SearXNG restart.

### CLI: `dg`

A terminal search tool that queries the degoog API. Install to your PATH:

```bash
cp tools/dg ~/.local/bin/dg
chmod +x ~/.local/bin/dg
```

Usage:

```bash
dg "search query"                # Web search (10 results)
dg -n 20 "deep topic"           # More results
dg -t news "linux kernel"       # News search
dg -s "privacy tools"           # SearXNG engines only
dg -j "query" | jq '.results'   # JSON output for scripting
dg -e "query"                   # Show engine timings
dg -l de "Datenschutz"          # German results
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEGOOG_PORT` | 8082 | degoog frontend port |
| `SEARXNG_PORT` | 8888 | SearXNG internal port |
| `SEARXNG_BIND_ADDRESS` | 127.0.0.1 | SearXNG bind (internal only) |
| `SEARXNG_SECRET` | random | SearXNG secret key |
| `SEARXNG_IMAGE_PROXY` | true | Proxy images through SearXNG |
| `SEARXNG_ENABLE_ENGINES` | *(see entrypoint)* | Comma-separated engines to activate on startup |
| `PUID` / `PGID` | 1000 | Container user/group ID |

### Activate Additional Engines

Set `SEARXNG_ENABLE_ENGINES` in `docker-compose.combined.yml`:

```yaml
environment:
  - SEARXNG_ENABLE_ENGINES=huggingface,hackernews,crates.io,npm,gitlab,wolframalpha
```

Or use the Engine Manager UI at runtime.

---

## Public instances

Some amazing people around the web decided to make their degoog instances available for everyone to use, and they 100% deserve a shout-out! Check out the full list [here](docs/repo/PUBLIC_INSTANCES.md)

## Store repositories

Aside from the official store these are third party repositories, they have been vetted once before adding them to the readme but I will not personally keep an eye on all of them, it's your responsibility to make sure what you install on your instance. I love open source and I'll obviously try to add these for as long as it's manageable to do so, eventually I may need a system for it, but for now they're comfy in the readme.

| name                 | url                                                     |
| :------------------- | :------------------------------------------------------ |
| official store       | `https://github.com/fccview/fccview-degoog-extensions`  |
| Subatomic1618 addons | `https://codeberg.org/Subatomic1618/degoog-addons.git`  |
| Weeb Paradise        | `https://codeberg.org/fccview/degoog-weeb-paradise.git` |
| Georgvwt stuff       | `https://github.com/Georgvwt/georgvwt-degoog-stuff.git` |
| Lazerleif Maps       | `https://github.com/lazerleif/degoog-maps.git`          |

## Documentation

Full customisation guide (plugins, themes, engines, store, settings gate, aliases, env): **[documentation](https://fccview.github.io/degoog)**.

## Little shoutout

This project would have never existed if the amazing [searxng](https://github.com/searxng/searxng) developers hadn't had the idea first. This is my take on a heavily customisable search aggregrator, it's meant to be a more modular lighter alternative, you can add as much as you want to it, but the core will stay as simple as it gets.

Alternatives are what make the internet a fun place, let me share a few other aggregators you may want to try out, the beauty of open source is that there's no competition (or at least there shouldn't be, none of us do this shit for money after all).

| name       | repo                                 |
| :--------- | :----------------------------------- |
| searxng    | https://github.com/searxng/searxng   |
| 4get       | https://git.lolcat.ca/lolcat/4get    |
| OmniSearch | https://git.bwaaa.monster/omnisearch |
| LibreY     | https://github.com/Ahwxorg/LibreY    |

[![Star History Chart](https://api.star-history.com/image?repos=fccview/degoog&type=date&legend=top-left)](https://www.star-history.com/?repos=fccview%2Fdegoog&type=date&legend=top-left)
