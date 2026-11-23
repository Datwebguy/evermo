// English / 中文. The interface is written in English; in Chinese every piece of interface text is looked up in `zh`,
// with numbers, amounts, dates and addresses carried over as they are. Content written by people or agents (agent names,
// descriptions, answers, addresses) is marked `data-notr` and never translated.
import { zh } from "./zh";

export type Lang = "en" | "zh";
const KEY = "evermo-lang";
let lang: Lang = (() => {
  try { const v = localStorage.getItem(KEY); if (v === "en" || v === "zh") return v; } catch { /* storage off */ }
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
})();
export const getLang = () => lang;
const subs = new Set<() => void>();
export const onLang = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

// Values carried over unchanged, in order: dates, addresses, amounts with their token, plain numbers.
const VALUE = /(?:[A-Z][a-z]{2} \d{1,2}, \d{4})|(?:\d{4}年\d{1,2}月\d{1,2}日)|(?:0x[0-9a-fA-F]{4,}(?:…[0-9a-fA-F]{4})?)|(?:\$?\d[\d,]*(?:\.\d+)?(?: (?:USDT0|BEM|OKB))?)/g;

/** Translates one piece of interface text, or returns it unchanged. */
export function tr(text: string): string {
  if (lang === "en") return text;
  const lead = text.match(/^\s*/)![0], tail = text.match(/\s*$/)![0], core = text.trim();
  if (!core) return text;
  if (zh[core] !== undefined) return lead + zh[core] + tail;
  const values: string[] = [];
  const key = core.replace(VALUE, (m) => { values.push(m); return "{n}"; });
  const hit = zh[key];
  if (hit === undefined) return text;
  let i = 0;
  return lead + hit.replace(/\{n\}/g, () => values[i++] ?? "") + tail;
}

// ---- Live translation of the page ----
const original = new WeakMap<Text, string>();  // what the app wrote
const written = new WeakMap<Text, string>();   // what we put there
const ATTRS = ["placeholder", "aria-label", "title"];
const attrOriginal = new WeakMap<Element, Record<string, string>>();

const skip = (n: Node) => !!(n.parentElement?.closest("[data-notr], script, style, svg, textarea, input"));
const orig = (t: Text) => { const w = written.get(t); if (w === undefined || w !== t.nodeValue) original.set(t, t.nodeValue ?? ""); return original.get(t) ?? ""; };
const put = (t: Text, v: string) => { if (t.nodeValue !== v) t.nodeValue = v; written.set(t, v); };

function element(el: Element) {
  if (el.closest("[data-notr], script, style, svg")) return;
  const kids = [...el.childNodes];
  const texts = kids.filter((n): n is Text => n.nodeType === 3);
  const parts = texts.map(orig);
  if (texts.length > 1 && texts.length === kids.length) {
    // A sentence React built from several pieces: translate it whole when there is a whole translation.
    const whole = parts.join(""), out = tr(whole);
    if (out !== whole) { put(texts[0], out); texts.slice(1).forEach((t) => put(t, "")); }
    else texts.forEach((t, i) => put(t, tr(parts[i])));
  } else texts.forEach((t, i) => put(t, tr(parts[i])));
  const saved = attrOriginal.get(el) ?? {};
  for (const a of ATTRS) {
    const v = el.getAttribute(a); if (v === null) continue;
    if (saved[a] === undefined || (v !== tr(saved[a]))) saved[a] = v;
    const want = tr(saved[a]); if (v !== want) el.setAttribute(a, want);
  }
  attrOriginal.set(el, saved);
}
function walk(root: Element) { element(root); root.querySelectorAll("*").forEach(element); }

let observer: MutationObserver | null = null;
export function startTranslating(root: Element = document.body) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  walk(root);
  observer?.disconnect();
  observer = new MutationObserver((ms) => {
    const els = new Set<Element>();
    for (const m of ms) {
      if (m.type === "characterData") { const p = m.target.parentElement; if (p && !skip(m.target)) els.add(p); }
      else if (m.type === "attributes") els.add(m.target as Element);
      else m.addedNodes.forEach((n) => { if (n.nodeType === 1) els.add(n as Element); else if (n.parentElement) els.add(n.parentElement); });
    }
    observer!.disconnect();
    els.forEach((e) => (e.nodeType === 1 && e.isConnected ? walk(e) : null));
    observer!.observe(root, OPTS);
  });
  observer.observe(root, OPTS);
}
const OPTS: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS };

export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* storage off */ }
  subs.forEach((f) => f());
  startTranslating();
}
