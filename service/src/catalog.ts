// What the app lists: every registered agent with its owner, record, active listing and description, read from X Layer.
import { Contract, type JsonRpcProvider } from "ethers";
import type { Indexer } from "./indexer.ts";

const descCache = new Map<string, { at: number; v: any }>();
async function describe(manifestUrl: string): Promise<{ name: string | null; description: string | null; live: boolean }> {
  if (!/^https?:\/\//.test(manifestUrl)) return { name: null, description: null, live: false };
  const c = descCache.get(manifestUrl);
  if (c && Date.now() - c.at < (c.v.live ? 600_000 : 30_000)) return c.v; // a missing description is retried soon
  let v = { name: null as string | null, description: null as string | null, live: false };
  try {
    const r = await fetch(manifestUrl.replace(/\/$/, "") + "/.well-known/tapeapi.json", { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (r.ok) { const m = await r.json(); v = { name: typeof m.name === "string" ? m.name : null, description: typeof m.description === "string" ? m.description : (m.methods?.[0]?.description ?? null), live: true }; }
  } catch { /* unreachable: shown as not switched on */ }
  descCache.set(manifestUrl, { at: Date.now(), v });
  return v;
}

export function catalog(p: JsonRpcProvider, ix: Indexer, at: { registry: string; market: string }) {
  const registry = new Contract(at.registry, [
    "function agentOf(bytes32) view returns (tuple(address circuits, uint256 tokenId, address builder, uint64 registeredAt, string manifest))",
    "function holderOf(bytes32) view returns (address)",
    "function recordOf(bytes32) view returns (tuple(uint64 work, uint64 payments, uint64 blocked, uint64 sales, uint256 lastSalePrice, address lastSaleToken))",
  ], p);
  const market = new Contract(at.market, [
    "function activeListingOf(bytes32) view returns (uint256)",
    "function listingOf(uint256) view returns (tuple(bytes32 agentId, address seller, address token, uint256 price, uint64 expiresAt, bool active))",
  ], p);

  async function one(agentId: string, last: Map<string, number>) {
    const [a, holder, rec, act] = await Promise.all([registry.agentOf(agentId), registry.holderOf(agentId), registry.recordOf(agentId), market.activeListingOf(agentId)]);
    let listing = null;
    if (act > 0n) {
      const l = await market.listingOf(act - 1n);
      if (l.active && Number(l.expiresAt) > Date.now() / 1000)
        listing = { id: (act - 1n).toString(), seller: l.seller, token: l.token, price: l.price.toString(), expiresAt: Number(l.expiresAt) };
    }
    const d = await describe(a.manifest);
    return {
      agentId, circuits: a.circuits, tokenId: a.tokenId.toString(), builder: a.builder, registeredAt: Number(a.registeredAt),
      address: a.manifest, name: d.name, description: d.description, switchedOn: d.live,
      owner: listing ? listing.seller : holder,
      record: { work: Number(rec.work), payments: Number(rec.payments), blocked: Number(rec.blocked), sales: Number(rec.sales),
        lastSalePrice: rec.lastSalePrice.toString(), lastSaleToken: rec.lastSaleToken },
      listing, lastActivity: last.get(agentId.toLowerCase()) ?? Number(a.registeredAt),
    };
  }
  return {
    async list() {
      const last = ix.lastActivity();
      return Promise.all(ix.agents().map((e) => one(e.agentId!, last)));
    },
    async get(agentId: string) { return one(agentId, ix.lastActivity()); },
  };
}
