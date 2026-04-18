#!/bin/sh
PUID=${PUID:-1000}
PGID=${PGID:-1000}

mkdir -p /app/data /app/data/engines /app/data/plugins /app/data/themes
chown -R ${PUID}:${PGID} /app/data

sync_managed_dir() {
  src="$1"
  dst="$2"
  mkdir -p "$(dirname "$dst")"
  rm -rf "$dst"
  cp -R "$src" "$dst"
  chown -R ${PUID}:${PGID} "$dst"
}

for engine_dir in /app/data-default/engines/*; do
  [ -e "$engine_dir" ] || continue
  sync_managed_dir "$engine_dir" "/app/data/engines/$(basename "$engine_dir")"
done

sync_managed_dir \
  /app/data-default/plugins/searxng-manager \
  /app/data/plugins/searxng-manager

# Patch SearXNG settings
SETTINGS=/etc/searxng/settings.yml
ENGINES_TO_ENABLE="${SEARXNG_ENABLE_ENGINES:-huggingface,huggingface datasets,huggingface spaces,cachy os packages,hackernews,ollama,crates.io,npm,gitlab,nixos wiki,wolframalpha}"
export SETTINGS ENGINES_TO_ENABLE

python3 - <<'PY'
import os
import yaml

settings_path = os.environ["SETTINGS"]
enabled_names = {
    item.strip()
    for item in os.environ.get("ENGINES_TO_ENABLE", "").split(",")
    if item.strip()
}

with open(settings_path, "r", encoding="utf-8") as fh:
    settings = yaml.safe_load(fh)

search_section = settings.setdefault("search", {})
formats = search_section.setdefault("formats", ["html"])
if "json" not in formats:
    formats.append("json")

for engine in settings.get("engines", []):
    name = str(engine.get("name", "")).strip()
    if name in enabled_names:
        engine["disabled"] = False

with open(settings_path, "w", encoding="utf-8") as fh:
    yaml.safe_dump(settings, fh, sort_keys=False, allow_unicode=True)
PY

exec /usr/bin/supervisord -c /etc/supervisord.conf
