// Token Risk Check: contract facts read from X Layer and market facts from GeckoTerminal, summarised by the AI model.
import { Contract, formatUnits, getAddress, isAddress, ZeroAddress } from "ethers";
import { provider } from "../chain.ts";
import type { AgentDef } from "../manifest.ts";
import { BadInput } from "./positionWatch.ts";

export const def: AgentDef = {
  name: "Token Risk Check",
  description: "Checks a token on X Layer: its contract, who controls it, its liquidity and its trading.",
  methods: [{ name: "check", priceBEM: "0", params: { token: "address", lang: "string?" }, returns: "report",
    description: "Checks a token on X Layer: who controls it, its liquidity and its trading, with a short summary in plain words" }],
  tools: [{ name: "check", title: "Token check",
    description: "Read a token's contract, owner controls, liquidity pools and trading on X Layer.",
    inputSchema: { type: "object", properties: { token: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" }, lang: { type: "string", enum: ["en", "zh"] } }, required: ["token"], additionalProperties: false } }],
};

const EIP1967_IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const GT = "https://api.geckoterminal.com/api/v2/networks/x-layer";

async function tryCall<T>(c: Contract, f: string, block: number): Promise<T | null> {
  try { return await (c as any)[f]({ blockTag: block }); } catch { return null; }
}
// GeckoTerminal's free API allows about 30 calls a minute: answers are cached for two minutes and busy replies retried.
const cache = new Map<string, { at: number; v: any }>();
async function gecko(path: string): Promise<any | null> {
  const c = cache.get(path);
  if (c && Date.now() - c.at < 120_000) return c.v;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(GT + path, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (r.status === 404) { cache.set(path, { at: Date.now(), v: null }); return null; }
    if (r.ok) { const v = await r.json(); cache.set(path, { at: Date.now(), v }); return v; }
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  throw new MarketBusy();
}
class MarketBusy extends Error {}

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
  let info: any = null, pools: any = null, marketOk = true;
  try { [info, pools] = await Promise.all([gecko(`/tokens/${token.toLowerCase()}/info`), gecko(`/tokens/${token.toLowerCase()}/pools?page=1`)]); }
  catch (e) { if (!(e instanceof MarketBusy)) throw e; marketOk = false; }
  const list = (pools?.data ?? []).map((p: any) => ({
    name: p.attributes.name, address: p.attributes.address, dex: p.relationships?.dex?.data?.id ?? null,
    liquidityUsd: p.attributes.reserve_in_usd, volume24hUsd: p.attributes.volume_usd?.h24 ?? null, createdAt: p.attributes.pool_created_at,
  }));
  const liq = list.reduce((s: number, p: any) => s + Number(p.liquidityUsd ?? 0), 0);
  const a = info?.data?.attributes;
  return {
    block, token,
    contract: {
      name, symbol, decimals: decimals === null ? null : Number(decimals),
      totalSupply: totalSupply === null ? null : decimals === null ? totalSupply.toString() : formatUnits(totalSupply, Number(decimals)),
      codeBytes: (code.length - 2) / 2,
      upgradeable: impl !== null, implementation: impl,
      owner: owner === null ? null : owner, ownerRenounced: owner === ZeroAddress,
      pausable: paused !== null, ...(paused !== null ? { paused } : {}),
    },
    market: !marketOk ? null : {
      pools: list.length, totalLiquidityUsd: liq.toFixed(2), largestPools: list.slice(0, 5),
      flaggedHoneypot: a?.is_honeypot === true ? true : a?.is_honeypot === false ? false : null,
      ...(a?.holders?.count != null ? { holders: a.holders.count } : {}),
    },
    sources: marketOk ? { chain: "X Layer at block " + block, market: "GeckoTerminal" } : { chain: "X Layer at block " + block },
  };
}

/** A short verdict written from the facts alone, used when the AI model is not available. */
export function plainSummary(f: Awaited<ReturnType<typeof facts>>, lang: "en" | "zh"): string {
  const c = f.contract, m = f.market, zh = lang === "zh";
  const control = c.upgradeable
    ? (zh ? "合约可升级，规则可能被更改" : "The contract can be upgraded, so its rules can change")
    : c.owner && !c.ownerRenounced ? (zh ? "合约由一个地址控制" : "One address controls the contract")
    : (zh ? "合约不可升级，也没有控制者" : "The contract cannot be upgraded and has no controller");
  const usd = (v: string) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const liq = m === null ? (zh ? "市场数据暂时无法获取" : "market data is not available right now")
    : m.pools === 0 ? (zh ? "没有交易池" : "it has no trading pools")
    : zh ? `${m.pools} 个交易池共约 $${usd(m.totalLiquidityUsd)} 流动性`
    : `it has about $${usd(m.totalLiquidityUsd)} of liquidity in ${m.pools} pools`;
  return zh ? `${control}；${liq}。` : `${control}; ${liq}.`;
}
