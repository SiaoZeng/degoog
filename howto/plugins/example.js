let apiUrl = "";
let apiKey = "";

export default {
  name: "Example",
  description: "An example bang command",
  trigger: "example",
  aliases: ["ex"],

  settingsSchema: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      required: true,
      placeholder: "https://api.example.com",
      description: "Base URL for the example API",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      secret: true,
      placeholder: "Leave blank if not required",
      description: "API key for authentication",
    },
  ],

  configure(settings) {
    apiUrl = settings.apiUrl || "";
    apiKey = settings.apiKey || "";
  },

  async isConfigured() {
    return !!apiUrl;
  },

  async execute(args) {
    if (!apiUrl) {
      return {
        title: "Example",
        html: `<div class="command-result"><p>Not configured. Go to <a href="/settings">Settings → Plugins</a> to set up Example.</p></div>`,
      };
    }
    return {
      title: "Example Command",
      html: `<div class="command-result"><p>You ran <code>!example</code> with args: <strong>${args || "(none)"}</strong></p></div>`,
    };
  },
};
