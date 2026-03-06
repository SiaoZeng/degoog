let apiKey = "";

export default {
  name: "Example",

  settingsSchema: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      secret: true,
      required: true,
      placeholder: "Enter your API key",
      description: "Required to fetch results from the example provider",
    },
  ],

  configure(settings) {
    apiKey = settings.apiKey || "";
  },

  async executeSearch(query, page = 1, timeFilter) {
    if (!apiKey) return [];
    return [
      {
        title: "Example result for: " + query,
        url: "https://example.com",
        snippet: "Plugin engine example. Replace this with your own fetch logic.",
        source: "Example",
      },
    ];
  },
};
