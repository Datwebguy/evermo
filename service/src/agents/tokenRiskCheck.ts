// Token Risk Check: contract facts read from X Layer and market facts from GeckoTerminal, summarised by the AI model.
import { Contract, getAddress, isAddress, ZeroAddress } from "ethers";
import { provider } from "../chain.ts";
import type { AgentDef } from "../manifest.ts";
import { BadInput } from "./positionWatch.ts";

export const def: AgentDef = {
  name: "Token Risk Check",
  description: "Checks a token on X Layer: its contract, who controls it, its liquidity and its trading.",
  methods: [{ name: "check", priceBEM: "0", params: { token: "address" }, returns: "report",
    description: "A report on the token's contract, owner controls, liquidity and trading, with a plain summary" }],
  tools: [{ name: "check", title: "Token check",
    description: "Read a token's contract, owner controls, liquidity pools and trading on X Layer.",
    inputSchema: { type: "object", properties: { token: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" } }, required: ["token"], additionalProperties: false } }],
};

const EIP1967_IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const GT = "https://api.geckoterminal.com/api/v2/networks/x-layer";

async function tryCall<T>(c: Contract, f: string, block: number): Promise<T | null> {
  try { return await (c as any)[f]({ blockTag: block }); } catch { return null; }
}
async function gecko(path: string): Promise<any | null> {
  const r = await fetch(GT + path, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("market data unavailable (" + r.status + ")");
  return r.json();
}

export async function facts(params: any) {
  if (!isAddress(params?.token)) throw new BadInput("token must be an address");
  const token = getAddress(params.token);
  const block = await provider.getBlockNumber();
  const code = await provider.getCode(token, block);
  if (code === "0x") throw new BadInput("There is no contract at this address on X Layer");
  const c = new Contract(token, ["function name() view returns (string)", "function symbol() view returns (string)",
    "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)", "function owner() view returns (address)",
    "function paused() view returns (bool)"], provider);
  const [name, symbol, decimals, totalSupply, owner, paused, implSlot] = await Promise.all([
    tryCall<string>(c, "name", block), tryCall<string>(c, "symbol", block), tryCall<bigint>(c, "decimals", block),
    tryCall<bigint>(c, "totalSupply", block), tryCall<string>(c, "owner", block), tryCall<boolean>(c, "paused", block),
    provider.getStorage(token, EIP1967_IMPL, block)]);
  const impl = BigInt(implSlot) === 0n ? null : getAddress("0x" + implSlot.slice(26));
  const [info, pools] = await Promise.all([gecko(`/tokens/${token.toLowerCase()}/info`), gecko(`/tokens/${token.toLowerCase()}/pools?page=1`)]);
  const list = (pools?.data ?? []).map((p: any) => ({
    name: p.attributes.name, address: p.attributes.address, dex: p.relationships?.dex?.data?.id ?? null,
    liquidityUsd: p.attributes.reserve_in_usd, volume24hUsd: p.attributes.volume_usd?.h24 ?? null, createdAt: p.attributes.pool_created_at,
  }));
  const liq = list.reduce((s: number, p: any) => s + Number(p.liquidityUsd ?? 0), 0);
  const a = info?.data?.attributes;
  return {
    block, token,
    contract: {
      name, symbol, decimals: decimals === null ? null : Number(decimals), totalSupply: totalSupply?.toString() ?? null,
      codeBytes: (code.length - 2) / 2,
      upgradeable: impl !== null, implementation: impl,
      owner: owner === null ? null : owner, ownerRenounced: owner === ZeroAddress,
      pausable: paused !== null, paused,
    },
    market: {
      pools: list.length, totalLiquidityUsd: liq.toFixed(2), largestPools: list.slice(0, 5),
      flaggedHoneypot: a?.is_honeypot === true ? true : a?.is_honeypot === false ? false : null,
      holders: a?.holders?.count ?? null,
    },
    sources: { chain: "X Layer at block " + block, market: "GeckoTerminal" },
  };
}
