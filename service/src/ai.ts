// TAP-17 sidecar: forwards OpenAI-format chat requests to the AI provider and signs a usage receipt for each answer.
import { createHash, randomBytes } from "node:crypto";
import type { Wallet } from "ethers";
import { ai } from "./config.ts";
import { amount, fmt, pricesFromModels, usageFromOpenAI, type Price } from "./pricing.ts";
import { sign, type Envelope } from "./tap13.ts";

const sha256hex = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
export const PATH = "/v1/chat/completions";

let table = new Map<string, Price>(), loadedAt = 0;
/** Live price list from the provider, refreshed every hour. */
export async function prices(): Promise<Map<string, Price>> {
  if (Date.now() - loadedAt > 3600_000 || table.size === 0) {
    const r = await fetch(ai.baseUrl + "/models", { headers: { authorization: `Bearer ${ai.apiKey}` }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("price list unavailable (" + r.status + ")");
    const t = pricesFromModels(await r.json());
    if (t.size === 0) throw new Error("price list empty");
    table = t; loadedAt = Date.now();
  }
  return table;
}
export async function priceOf(model: string): Promise<Price> {
  const p = (await prices()).get(model);
  if (!p) throw new Error(`no published price for ${model}`);
  return p;
}

export type Receipt = Envelope & { method: "openai_chat"; params: { path: string; requestSha256: string } };
export type Metered = { status: number; body: Uint8Array; contentType: string; receipt: Receipt; json: any };

/** Sends a whole (non-streamed) chat request and returns the answer with its signed receipt. */
export async function meteredChat(signer: Wallet, container: string, model: string, requestBody: Uint8Array): Promise<Metered> {
  const requestSha256 = sha256hex(requestBody);
  const r = await fetch(ai.baseUrl + "/chat/completions", {
    method: "POST", redirect: "manual", body: Buffer.from(requestBody), signal: AbortSignal.timeout(120000),
    headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
  });
  if (r.status >= 300 && r.status < 400 && r.status !== 304) throw new Error("upstream redirect refused");
  const body = new Uint8Array(await r.arrayBuffer());
  let json: any = null; try { json = JSON.parse(new TextDecoder().decode(body)); } catch { /* not JSON */ }
  const reported = typeof json?.model === "string" ? json.model : null;
  const priced = await prices();
  const matchedBy = reported && priced.has(reported) ? "response" : priced.has(model) ? "request" : null;
  const entry = matchedBy === "response" ? priced.get(reported!)! : matchedBy === "request" ? priced.get(model)! : null;
  const usage = r.ok ? usageFromOpenAI(json?.usage) : null;
  const result: Record<string, unknown> = {
    model: reported ?? (entry ? model : null),
    usage,
    responseSha256: sha256hex(body),
    stream: false,
    complete: r.status >= 200 && r.status < 300,
    status: r.status,
    prices: entry && usage ? [{ currency: entry.currency, amount: fmt(amount(entry, usage)) }] : null,
  };
  if (matchedBy) result.modelMatchedBy = matchedBy;
  const id = typeof json?.id === "string" && /^[\x21-\x7e]{1,128}$/.test(json.id) ? json.id : "r-" + randomBytes(16).toString("hex");
  const params = { path: PATH, requestSha256 };
  const env = await sign(signer, container, id, "openai_chat", params, { ok: true, result });
  const receipt: Receipt = { id: env.id, ok: true, container, ts: env.ts, method: "openai_chat", params, result, sig: env.sig };
  return { status: r.status, body, contentType: r.headers.get("content-type") ?? "application/json", receipt, json };
}

export const encodeReceipt = (r: Receipt) => Buffer.from(JSON.stringify(r)).toString("base64url");
