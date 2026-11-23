// Checks an agent that runs elsewhere before Evermo lists it: its TAP-11 manifest, the current owner's delegation,
// its container, and (when it publishes tools) that the tools it serves match the pinned hash (TAP-15).
import { getAddress, isAddress } from "ethers";
import { delegationSigner, MAX_DELEGATION } from "./manifest.ts";
import { toolsSha256 } from "./tools.ts";

export type Chain = {
  chainId: number; hub: string;
  holderOf(circuits: string, tokenId: bigint): Promise<string>;
  containerOf(circuits: string, tokenId: bigint): Promise<{ container: string; opened: boolean }>;
};
export type Check = { ok: boolean; problems: string[]; manifest?: any };

const PRICE = /^[0-9]+(\.[0-9]{1,8})?$/;
const METHOD = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000), ...init });
  if (!r.ok) throw new Error(`${url} answered ${r.status}`);
  const t = await r.text();
  if (t.length > 512 * 1024) throw new Error(`${url} is too large`);
  return JSON.parse(t);
}

export async function verifyManifest(m: any, chain: Chain, now = Math.floor(Date.now() / 1000)): Promise<Check> {
  const problems: string[] = [];
  const bad = (s: string) => problems.push(s);
  if (!m || typeof m !== "object") return { ok: false, problems: ["The agent's description file is not readable"] };
  if (m.tapeapi !== "0.1") bad("Unsupported description format");
  if (typeof m.name !== "string" || !m.name.trim()) bad("The agent has no name");
  if (!isAddress(m.circuits) || !isAddress(m.container) || !isAddress(m.signer)) bad("Addresses in the description are not valid");
  if (typeof m.tokenId !== "string" || !/^(0|[1-9][0-9]*)$/.test(m.tokenId)) bad("The agent's number is not valid");
  const live = m.endpoints?.live;
  if (typeof m.endpoints?.async !== "boolean") bad("The description does not say how the agent takes requests");
  if (!Array.isArray(live) || live.length === 0 || !live.every((u: unknown) => typeof u === "string" && u.startsWith("https://"))) bad("The agent has no secure address");
  if (!Array.isArray(m.methods) || m.methods.length === 0) bad("The agent lists nothing it can do");
  else for (const x of m.methods) {
    if (!METHOD.test(x?.name ?? "") || !PRICE.test(x?.priceBEM ?? "")) { bad(`The task "${x?.name}" is not described correctly`); break; }
  }
  if (problems.length) return { ok: false, problems };

  const tokenId = BigInt(m.tokenId);
  const [holder, c] = await Promise.all([chain.holderOf(m.circuits, tokenId), chain.containerOf(m.circuits, tokenId)]);
  if (getAddress(c.container) !== getAddress(m.container)) bad("The container does not belong to this agent");
  if (!c.opened) bad("The agent's container has not been opened");
  const e = m.delegation?.expires;
  if (!Number.isSafeInteger(e) || e <= now) bad("The owner's approval has ended");
  else if (e > now + MAX_DELEGATION) bad("The owner's approval runs for more than 366 days");
  else {
    let by = "";
    try { by = delegationSigner(chain.chainId, chain.hub, m.container, m.signer, e, m.delegation.sig); } catch { /* invalid signature */ }
    if (!by || getAddress(by) !== getAddress(holder)) bad("The approval was not signed by the agent's current owner");
  }
  return { ok: problems.length === 0, problems, manifest: m };
}

/** Pinned tools: what the agent serves must hash to what its description promises. */
export async function verifyTools(m: any): Promise<string | null> {
  if (!m.mcp) return null;
  if (typeof m.mcp.endpoint !== "string" || !m.mcp.endpoint.startsWith("https://") || !/^[0-9a-f]{64}$/.test(m.mcp.toolsSha256 ?? ""))
    return "The tool list is not described correctly";
  const r = await getJson(m.mcp.endpoint, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) });
  const tools = r?.result?.tools;
  if (!Array.isArray(tools)) return "The agent did not return its tools";
  try { return toolsSha256(tools) === m.mcp.toolsSha256 ? null : "The agent's tools have changed since its owner approved them"; }
  catch { return "The agent's tool list is not valid"; }
}

/** Fetches a manifest from a site or service address and runs every check. */
export async function verifyAgentAt(base: string, chain: Chain): Promise<Check> {
  let m: any;
  try { m = await getJson(base.replace(/\/$/, "") + "/.well-known/tapeapi.json"); }
  catch (e: any) { return { ok: false, problems: ["The agent's description file could not be read"] }; }
  const c = await verifyManifest(m, chain);
  if (c.ok) { const t = await verifyTools(m).catch(() => "The agent's tools could not be checked"); if (t) { c.ok = false; c.problems.push(t); } }
  return c;
}
