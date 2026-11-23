// TAP-17 metering. Prices come from the provider's live model list, never hard-coded.
export type Price = { currency: string; unit: "1M tokens"; input: string; output: string;
  cacheRead?: string; cacheWrite?: string; cacheWrite1h?: string; reasoning?: string };
/** TAP-17 §4.1 usage object. */
export type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number;
  cache_read_tokens?: number; cache_write_tokens?: number; cache_write_1h_tokens?: number; reasoning_tokens?: number };

const SCALE = 8; // 1e-8 units
function units(dec: string): bigint {
  if (!/^\d+(\.\d{1,8})?$/.test(dec)) throw new Error("bad decimal " + dec);
  const [i, f = ""] = dec.split(".");
  return BigInt(i) * 10n ** BigInt(SCALE) + BigInt((f + "0".repeat(SCALE)).slice(0, SCALE));
}
/** Exactly 8 fraction digits (TAP-17 §4.3). */
export function fmt(u: bigint): string {
  const s = u.toString().padStart(SCALE + 1, "0");
  return s.slice(0, -SCALE) + "." + s.slice(-SCALE);
}

/** A = ceil(S / 1e6) in 1e-8 units, exact integers only. */
export function amount(p: Price, u: Usage): bigint {
  const B = (n?: number) => BigInt(n ?? 0);
  const cr = B(u.cache_read_tokens), cw = B(u.cache_write_tokens), cw1h = B(u.cache_write_1h_tokens);
  const rs = p.reasoning !== undefined ? B(u.reasoning_tokens) : 0n;
  const inP = units(p.input), crP = p.cacheRead ? units(p.cacheRead) : inP;
  const cwP = p.cacheWrite ? units(p.cacheWrite) : inP, cw1hP = p.cacheWrite1h ? units(p.cacheWrite1h) : cwP;
  let S = inP * (B(u.prompt_tokens) - cr - cw) + crP * cr + cwP * (cw - cw1h) + cw1hP * cw1h
    + units(p.output) * (B(u.completion_tokens) - rs);
  if (p.reasoning !== undefined) S += units(p.reasoning) * rs;
  return (S + 999_999n) / 1_000_000n;
}

/** OpenAI chat usage → TAP-17 usage, or null when counts are missing or inconsistent. */
export function usageFromOpenAI(x: any): Usage | null {
  const int = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
  if (!x || !int(x.prompt_tokens) || !int(x.completion_tokens)) return null;
  const u: Usage = { prompt_tokens: x.prompt_tokens, completion_tokens: x.completion_tokens,
    total_tokens: x.prompt_tokens + x.completion_tokens };
  const cr = x.prompt_tokens_details?.cached_tokens, rs = x.completion_tokens_details?.reasoning_tokens;
  if (int(cr) && cr > 0) { if (cr > u.prompt_tokens) return null; u.cache_read_tokens = cr; }
  if (int(rs) && rs > 0) { if (rs > u.completion_tokens) return null; u.reasoning_tokens = rs; }
  return u;
}

/** NEAR AI /v1/models → TAP-17 prices. Uses textPricing (decimal strings, USD per 1M tokens, default tier). */
export function pricesFromModels(list: any): Map<string, Price> {
  const out = new Map<string, Price>();
  for (const m of list?.data ?? []) {
    const t = m?.textPricing;
    const d = t?.tiers?.default?.short;
    if (!m?.id || t?.currency !== "USD" || t?.unit !== "million_tokens" || !d) continue;
    const ok = (v: unknown) => typeof v === "string" && /^\d+(\.\d+)?$/.test(v);
    if (!ok(d.uncachedInput) || !ok(d.output)) continue;
    const p: Price = { currency: "USD", unit: "1M tokens", input: d.uncachedInput, output: d.output };
    if (ok(d.cachedInput)) p.cacheRead = d.cachedInput;
    out.set(m.id, p);
  }
  return out;
}
