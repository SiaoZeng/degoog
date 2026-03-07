import type { BangCommand, CommandResult } from "../../../types";

export const uuidCommand: BangCommand = {
  name: "UUID Generator",
  description: "Generate a random UUID v4",
  trigger: "uuid",
  async execute(): Promise<CommandResult> {
    const uuids = Array.from({ length: 10 }, () => crypto.randomUUID());
    const rows = uuids
      .map((u) => `<div class="uuid-row"><code class="uuid-value">${u}</code><button type="button" class="uuid-copy" data-uuid="${u}">Copy</button></div>`)
      .join("");
    return {
      title: "Generated UUIDs",
      html: `<div class="command-result command-uuid">${rows}</div>`,
    };
  },
};
