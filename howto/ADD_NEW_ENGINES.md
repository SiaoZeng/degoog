# Adding a new built-in engine

1. **Create** `src/engines/<name>.ts` implementing the `SearchEngine` interface (`name`, `executeSearch(query, page?, timeFilter?)` returning `Promise<SearchResult[]>`).
2. **Register** in `src/engines/registry.ts`: add one entry to `BUILTIN_DEFINITIONS` with `id`, `displayName`, `searchType`, and your engine class.

No other files need changes. Settings toggles and API params are derived from the registry.

## Optional: configurable settings

If your engine requires user-provided credentials (e.g. an API key), add a `settingsSchema` property to your class and read values from `plugin-settings.ts` at query time:

```ts
import { getSettings } from "../plugin-settings";

export class MyEngine implements SearchEngine {
  name = "My Engine";

  settingsSchema: SettingField[] = [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      secret: true,
      required: true,
      placeholder: "Enter your API key",
    },
  ];

  configure(_settings: Record<string, string>): void {}

  async executeSearch(query: string): Promise<SearchResult[]> {
    const stored = await getSettings("my-engine"); // must match id in BUILTIN_DEFINITIONS
    const apiKey = stored["apiKey"] ?? "";
    if (!apiKey) return [];
    // ...
  }
}
```

The Configure button and modal are generated automatically in Settings → Engines from the schema.

For external (non-built-in) engines, see [/howto/engines/README.md](/howto/engines/README.md).
