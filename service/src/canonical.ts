// RFC 8785 (JCS) canonical JSON, as required by TAP-11 §6 and TAP-13.
export function canonicalJSON(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("non-finite number");
    return JSON.stringify(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "bigint") throw new Error("bigint not allowed; use decimal strings");
  if (Array.isArray(v)) return "[" + v.map(canonicalJSON).join(",") + "]";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort(utf16Compare);
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJSON(o[k])).join(",") + "}";
  }
  throw new Error("unsupported type " + typeof v);
}

function utf16Compare(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a.charCodeAt(i) - b.charCodeAt(i);
    if (d) return d;
  }
  return a.length - b.length;
}
