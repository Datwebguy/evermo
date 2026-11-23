// Calls to Evermo's agent service. Answers are checked against the signer the agent's owner approved.
import { getBytes } from "ethers";
import { dep } from "../chain/deployment";
import { recover, type Envelope } from "../../../service/src/tap13";
import { ownerDigest, OWNER_HEADER } from "../../../service/src/auth";
import { toolsSha256 } from "../../../service/src/tools";

export type Record_ = { work: number; payments: number; blocked: number; sales: number; lastSalePrice: string; lastSaleToken: string };
export type Listing = { id: string; seller: string; token: string; price: string; expiresAt: number };
export type AgentCard = {
  agentId: string; circuits: string; tokenId: string; builder: string; registeredAt: number; address: string;
  name: string | null; description: string | null; switchedOn: boolean; owner: string; record: Record_; listing: Listing | null; lastActivity: number;
};
export type Item = { block: number; time: number; tx: string; logIndex: number; source: string; name: string; agentId: string | null; data: Record<string, any> };

const get = async <T,>(path: string): Promise<T> => {
  const r = await fetch(dep().service + path);
  if (!r.ok) throw new Error("Evermo could not load this right now.");
  return r.json();
};
export const agents = () => get<{ agents: AgentCard[] }>("/agents").then((x) => x.agents);
export const agent = (id: string) => get<AgentCard>(`/agents/${id}`);
export const history = (id: string) => get<{ items: Item[] }>(`/agents/${id}/history`).then((x) => x.items);
export const activity = () => get<{ items: Item[] }>("/activity").then((x) => x.items);

export function live(on: (it: Item) => void): () => void {
  const es = new EventSource(dep().service + "/live");
  es.onmessage = (m) => { try { on(JSON.parse(m.data)); } catch { /* ignore */ } };
  return () => es.close();
}

export type Manifest = {
  name: string; circuits: string; tokenId: string; container: string; signer: string; delegation: { expires: number; sig: string };
  endpoints: { live: string[] }; methods: { name: string; description: string; params: Record<string, string>; priceBEM: string }[];
  mcp?: { endpoint: string; toolsSha256: string }; ai?: { models: { id: string; prices: { currency: string; input: string; output: string }[] }[] };
};
export async function manifest(address: string): Promise<Manifest | null> {
  try { const r = await fetch(address.replace(/\/$/, "") + "/.well-known/tapeapi.json"); return r.ok ? r.json() : null; } catch { return null; }
}

/** The tools the agent serves now, and whether they still match the fingerprint its owner approved. */
export async function toolsCheck(m: Manifest): Promise<{ tools: any[]; matches: boolean } | null> {
  if (!m.mcp) return null;
  try {
    const r = await fetch(m.mcp.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) });
    const tools = (await r.json())?.result?.tools ?? [];
    return { tools, matches: toolsSha256(tools) === m.mcp.toolsSha256 };
  } catch { return null; }
}

export type Answer = { env: Envelope; verified: boolean; payment?: { charged: string; allowed: boolean; tx: string | null }; recordTx?: string };
const newId = () => "e-" + crypto.getRandomValues(new Uint32Array(3)).join("");

/** Runs a task. With `sign`, the call is the owner's: paid from the budget and recorded. */
export async function run(m: Manifest, agentId: string, method: string, params: Record<string, unknown>,
  sign?: (digest: Uint8Array) => Promise<string>): Promise<Answer> {
  const id = newId();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sign) {
    const ts = Math.floor(Date.now() / 1000);
    headers[OWNER_HEADER] = `${ts}.${await sign(getBytes(ownerDigest(agentId, id, method, params, ts)))}`;
  }
  const r = await fetch(`${m.endpoints.live[0]}/${method}`, { method: "POST", headers, body: JSON.stringify({ id, method, params }) });
  const env: Envelope = await r.json();
  let verified = false;
  try { verified = recover(env, method, params).toLowerCase() === m.signer.toLowerCase() && env.container.toLowerCase() === m.container.toLowerCase(); } catch { /* bad signature */ }
  const pay = r.headers.get("x-evermo-payment");
  return { env, verified, payment: pay ? JSON.parse(pay) : undefined, recordTx: r.headers.get("x-evermo-record") ?? undefined };
}

export async function switchOn(address: string, expires: number, sig: string) {
  const r = await fetch(address.replace(/\/$/, "") + "/delegation", { method: "POST", body: JSON.stringify({ expires, sig }) });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Evermo could not save your approval.");
}

export async function watch(address: string, agentId: string, account: string, warnBelow: string, sign: (d: Uint8Array) => Promise<string>) {
  const id = newId(), params = { account, warnBelow }, ts = Math.floor(Date.now() / 1000);
  const sig = await sign(getBytes(ownerDigest(agentId, id, "watch", params, ts)));
  const r = await fetch(address.replace(/\/$/, "") + "/watch", { method: "POST", headers: { [OWNER_HEADER]: `${ts}.${sig}` }, body: JSON.stringify({ id, ...params }) });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "The watch could not be set.");
}

export async function checkOutside(url: string) {
  return get<{ ok: boolean; problems: string[]; name: string | null; circuits: string | null; tokenId: string | null }>(`/check-agent?url=${encodeURIComponent(url)}`);
}
