import { idbGet } from "./db.js";
import { SETTINGS_KEY } from "./constants.js";

let cachedRegistry = null;

export async function getRegistry() {
  if (cachedRegistry) return cachedRegistry;
  const res = await fetch("/api/engines");
  const data = await res.json();
  cachedRegistry = data;
  return cachedRegistry;
}

export const getEngines = async () => {
  const saved = (await idbGet(SETTINGS_KEY)) || {};
  const reg = await getRegistry();
  const merged = {};
  for (const { id } of reg.engines) {
    merged[id] = saved[id] ?? reg.defaults?.[id] ?? true;
  }
  return merged;
};

export function applyToggleStates(engines) {
  const container = document.getElementById("engine-toggles");
  if (!container) return;
  for (const [id, checked] of Object.entries(engines)) {
    const el = document.getElementById(`toggle-${id}`);
    if (el) el.checked = !!checked;
  }
}

export function getToggleStates() {
  const container = document.getElementById("engine-toggles");
  if (!container) return {};
  const inputs = container.querySelectorAll('[id^="toggle-"]');
  const state = {};
  for (const input of inputs) {
    const id = input.id.replace(/^toggle-/, "");
    state[id] = input.checked;
  }
  return state;
}

export function renderEngineToggles(engines) {
  const container = document.getElementById("engine-toggles");
  if (!container) return;
  container.innerHTML = "";
  for (const { id, displayName } of engines) {
    const label = document.createElement("label");
    label.className = "engine-toggle";
    label.innerHTML = `
      <input type="checkbox" id="toggle-${id}" checked>
      <span class="toggle-slider"></span>
      <span class="toggle-label">${escapeHtml(displayName)}</span>
    `;
    container.appendChild(label);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
