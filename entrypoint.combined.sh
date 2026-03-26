#!/bin/sh
PUID=${PUID:-1000}
PGID=${PGID:-1000}

mkdir -p /app/data /app/data/engines /app/data/plugins /app/data/themes
chown -R ${PUID}:${PGID} /app/data

# Copy SearXNG engine if not already present
if [ ! -f /app/data/engines/searxng/index.ts ]; then
  mkdir -p /app/data/engines/searxng
  cp /app/data-default/engines/searxng/index.ts /app/data/engines/searxng/index.ts
  chown -R ${PUID}:${PGID} /app/data/engines/searxng
fi

# Copy SearXNG manager plugin if not already present
if [ ! -f /app/data/plugins/searxng-manager/index.ts ]; then
  mkdir -p /app/data/plugins/searxng-manager
  cp /app/data-default/plugins/searxng-manager/* /app/data/plugins/searxng-manager/
  chown -R ${PUID}:${PGID} /app/data/plugins/searxng-manager
fi

# Patch SearXNG settings
SETTINGS=/etc/searxng/settings.yml

# Enable JSON output format
if ! grep -q '^\s*- json' "$SETTINGS"; then
  sed -i '/- html/a\    - json' "$SETTINGS"
fi

# Enable additional engines (read from SEARXNG_ENABLE_ENGINES env or use defaults)
ENGINES_TO_ENABLE="${SEARXNG_ENABLE_ENGINES:-huggingface,huggingface datasets,huggingface spaces,cachy os packages,hackernews,ollama,crates.io,npm,gitlab,nixos wiki,wolframalpha}"

# For each engine, find its "disabled: true" line and change to "disabled: false"
IFS=','
for engine_name in $ENGINES_TO_ENABLE; do
  engine_name=$(echo "$engine_name" | sed 's/^ *//;s/ *$//')
  # Find line number of "name: <engine_name>" then find next "disabled: true" within 6 lines
  line=$(grep -n "name: ${engine_name}$" "$SETTINGS" | head -1 | cut -d: -f1)
  if [ -n "$line" ]; then
    end=$((line + 6))
    sed -i "${line},${end}s/disabled: true/disabled: false/" "$SETTINGS"
  fi
done
unset IFS

exec /usr/bin/supervisord -c /etc/supervisord.conf
