# Search Engine Reliability and Proxy Notes

## Context

This repository is currently deployed on `w-saxs001` as the combined `degoog + SearXNG` container stack.

The search engine review on 2026-05-29 found that some upstream-backed engines were failing for runtime reasons outside normal HTML selector drift, and the runtime defaults were updated accordingly.

## Key operational point

The UI does **not** require a proxy.

A proxy is only relevant for **server-side outbound requests** when trying to use **direct Google-backed engines** from the Bun runtime.

- Browser -> degoog UI/API: no proxy required
- degoog backend -> Brave / Wikipedia / Reddit-via-Brave / local SearXNG: no extra proxy required
- degoog backend -> direct Google search endpoints: requires a suitable outbound proxy if Google must be used reliably

## Why direct Google is disabled by default

Direct Google scraping from the Bun runtime is not reliable on this host.

Observed behavior:

- `Google` web search frequently returned zero results
- `Google Images` frequently returned zero results or upstream denial behavior
- the failures were not just parser issues; the runtime was receiving challenge/blocked responses often enough that direct Google could not be trusted as a default source

As a result:

- `google` is disabled by default
- `google-images` is disabled by default

The Google parser was still hardened for environments where a proxy or different outbound client returns parseable XHTML/HTML, but direct Google is no longer part of the default runtime path.

## Current engine policy

### Enabled by default

#### Web

- `duckduckgo`
- `brave`
- `wikipedia`
- `reddit`
- `engine-searxng`

#### News

- `brave-news`
- `bing-news`
- `engine-searxng-news`

#### Images

- `bing-images`
- `engine-searxng-images`

#### Videos

- `google-videos`
- `bing-videos`
- `engine-searxng-videos`

### Disabled by default

- `google`
- `bing`
- `google-images`

## Engine-specific notes

### Reddit

The old direct Reddit JSON search path was not reliable from this runtime.

Current behavior:

- the `Reddit` engine uses a Brave `site:reddit.com` fallback
- result URLs are filtered to real `reddit.com` hosts
- results are surfaced as `source: "Reddit"`

This restores practical Reddit search without depending on blocked Reddit JSON endpoints.

### SearXNG

The combined-stack SearXNG engines remain the preferred escape hatch for broad upstream coverage.

Current behavior:

- combined SearXNG engines advertise a longer timeout (`16000ms`)
- this avoids premature timeouts seen with the generic `10000ms` engine timeout
- image search benefits from `SearXNG Images` being active in the combined stack

### Default config parsing

The route-level engine config parser now respects registry defaults when an engine flag is missing from the query string.

This matters because the old behavior treated an omitted flag as effectively enabled, which defeated `disabledByDefault` policy for engines such as Google.

## Operator guidance

### If you want reliable Google again

Do **not** change the UI.

Instead, add a server-side outbound proxy path that is suitable for Google traffic, then re-evaluate whether direct Google should be re-enabled by default.

Without that, direct Google should remain opt-in or disabled.

### If search quality needs more sources

Prefer:

1. `engine-searxng` and combined SearXNG typed engines
2. stable first-party engines like Brave / Wikipedia
3. targeted fallbacks like the Reddit-via-Brave strategy

Avoid re-enabling broken direct sources just to increase engine count.

## Verification snapshot

The following was verified after the changes:

- unit/engine tests passed
- combined container rebuilt and restarted successfully
- `/api/extensions` exposed `google` with `defaultEnabled=false`
- `/api/extensions` exposed `google-images` with `defaultEnabled=false`
- `/api/search/retry?engine=reddit` returned Reddit results again
- `/api/search/retry?engine=engine-searxng` returned SearXNG results again
- `/api/search?type=images` returned results from `Bing Images` and `SearXNG Images`
