// Light, dark, or follow the device. Remembered on this device only.
export type Theme = "auto" | "light" | "dark";
const KEY = "evermo-theme";
export function getTheme(): Theme { try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark") return v; } catch { /* storage off */ } return "auto"; }
export function applyTheme(t: Theme) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
  try { if (t === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* storage off */ }
}
export const isDark = (t: Theme) => t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
