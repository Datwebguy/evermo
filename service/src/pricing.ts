// TAP-17 metering. Prices come from the provider's live model list, never hard-coded.
export type Price = { currency: string; unit: "1M tokens"; input: string; output: string; cacheRead?: string; reasoning?: string };
export type Usage = { prompt: number; completion: number; cacheRead: number; reasoning: number };

const SCALE = 8; // 1e-8 units
function units(dec: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(dec)) throw new Error("bad decimal " + dec);
  const [i, f = ""] = dec.split(".");
  if (f.length > SCALE) throw new Error("too many decimals " + dec);
  return BigInt(i) * 10n ** BigInt(SCALE) + BigInt((f + "0".repeat(SCALE)).slice(0, SCALE));
}
export function fmt(u: bigint): string {
  const s = u.toString().padStart(SCALE + 1, "0");
  const r = (s.slice(0, -SCALE) + "." + s.slice(-SCALE)).replace(/\.?0+$/, "");
  return r || "0";
}

/** Amount in 1e-8 currency units: A = ceil(S / 1e6). Integer arithmetic only. */
export function amount(p: Price, u: Usage): bigint {
  const inP = units(p.input), outP = units(p.output);
  const crP = p.cacheRead !== undefined ? units(p.cacheRead) : inP;
  const rsP = p.reasoning !== undefined ? units(p.reasoning) : outP;
  const S = inP * BigInt(u.prompt - u.cacheRead) + crP * BigInt(u.cacheRead)
    + outP * BigInt(u.completion - u.reasoning) + rsP * BigInt(u.reasoning);
  return (S + 999_999n) / 1_000_000n;
}

export function usageFromOpenAI(x: any): Usage {
  const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
  if (!x || !Number.isInteger(x.prompt_tokens) || !Number.isInteger(x.completion_tokens)) throw new Error("no usage");
  return { prompt: x.prompt_tokens, completion: x.completion_tokens,
    cacheRead: n(x.prompt_tokens_details?.cached_tokens), reasoning: n(x.completion_tokens_details?.reasoning_tokens) };
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
