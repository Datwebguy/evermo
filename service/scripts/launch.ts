// After deployment: the agents' holder switches each agent on (signs the delegation of the service's signer and sends
// it to the service) and, if asked, lists them for their first sale. Reads deployments/<name>.json.
//
//   HOLDER_KEY=… NAME=xlayer SERVICE_URL=https://… [LIST="position-watch:20:USDT0,token-risk-check:20:USDT0"] [LIST_DAYS=30]
//   [XLAYER_RPC_URL=…] [CONFIRM=yes] npx tsx scripts/launch.ts
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet, parseUnits } from "ethers";
import { signDelegation, MAX_DELEGATION } from "../src/manifest.ts";

const env = (k: string, d?: string) => { const v = process.env[k] ?? d; if (v === undefined) throw new Error(`Missing ${k}`); return v; };
const name = env("NAME", "xlayer"), rpcUrl = env("XLAYER_RPC_URL", "https://rpc.xlayer.tech"), service = env("SERVICE_URL").replace(/\/$/, "");
const root = new URL("../../", import.meta.url);
const st = JSON.parse(readFileSync(new URL(`deployments/${name}.json`, root), "utf8"));
const app = JSON.parse(readFileSync(new URL(`deployments/${name}.app.json`, root), "utf8"));
const agents = JSON.parse(readFileSync(new URL(`deployments/${name}.agents.json`, root), "utf8")) as { slug: string; kind: string; circuits: string; tokenId: string }[];
const p = new JsonRpcProvider(rpcUrl, 196, { staticNetwork: true, cacheTimeout: -1 });
const holder = new Wallet(env("HOLDER_KEY"), p);
if (rpcUrl.includes("rpc.xlayer.tech") && process.env.CONFIRM !== "yes") { console.log("Mainnet: nothing sent. Run again with CONFIRM=yes."); process.exit(0); }

const nft = new Contract(st.processor, ["function ownerOf(uint256) view returns (address)", "function approve(address,uint256)", "function getApproved(uint256) view returns (address)"], holder);
const market = new Contract(app.market, ["function list(bytes32,address,uint256,uint64) returns (uint256)", "function activeListingOf(bytes32) view returns (uint256)"], holder);

for (const a of agents) {
  const owner = await nft.ownerOf(a.tokenId);
  if (owner.toLowerCase() !== holder.address.toLowerCase()) { console.log(`  skip   ${a.slug}: held by ${owner}, not this wallet`); continue; }
  const container = st[`agent.${a.kind}.opened`], expires = Math.floor(Date.now() / 1000) + MAX_DELEGATION - 3600;
  const sig = await signDelegation(holder, 196, app.hub, container, app.operator, expires);
  const r = await fetch(`${service}/a/${a.slug}/delegation`, { method: "POST", body: JSON.stringify({ expires, sig }) });
  console.log(r.ok ? `  ok     ${a.slug} switched on until ${new Date(expires * 1000).toISOString().slice(0, 10)}` : `  FAIL   ${a.slug}: ${await r.text()}`);
}

for (const item of (process.env.LIST ?? "").split(",").filter(Boolean)) {
  const [slug, price, sym] = item.split(":");
  const a = agents.find((x) => x.slug === slug); const t = app.tokens.find((x: any) => x.symbol === sym);
  if (!a || !t) throw new Error(`Bad LIST item ${item}`);
  const agentId = st[`agent.${a.kind}.agentId`];
  if ((await market.activeListingOf(agentId)) > 0n) { console.log(`  done   ${slug} is already listed`); continue; }
  if ((await nft.getApproved(a.tokenId)).toLowerCase() !== app.market.toLowerCase()) await (await nft.approve(app.market, a.tokenId)).wait();
  const days = Number(env("LIST_DAYS", "30"));
  await (await market.list(agentId, t.address, parseUnits(price, t.decimals), Math.floor(Date.now() / 1000) + days * 86400)).wait();
  console.log(`  ok     ${slug} listed at ${price} ${sym} for ${days} days`);
}
