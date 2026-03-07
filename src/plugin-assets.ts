const pluginCss = new Map<string, string>();
const pluginScriptPaths = new Set<string>();

export function addPluginCss(id: string, css: string): void {
  pluginCss.set(id, css);
}

export function registerPluginScript(folderName: string): void {
  pluginScriptPaths.add(folderName);
}

export function getAllPluginCss(): string {
  return Array.from(pluginCss.values()).join("\n");
}

export function getPluginScriptFolders(): string[] {
  return Array.from(pluginScriptPaths);
}
