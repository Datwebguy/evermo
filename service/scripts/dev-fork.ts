// Sets up Evermo on a local copy of X Layer for building and testing the app: deploys the contracts, creates both agents
// with real tape-outs and containers, switches them on, starts the service and writes app/public/deployment.json.
// Every value the app later shows comes from transactions made here on the local copy.
//
// Needs a forked node:  cd contracts && npx hardhat node --network xfork
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Contract, ContractFactory, JsonRpcProvider, JsonRpcSigner, Wallet, parseUnits } from "ethers";
import { signDelegation } from "../src/manifest.ts";

const RPC = process.env.FORK_RPC ?? "http://127.0.0.1:8545";
const PORT = Number(process.env.SERVICE_PORT ?? 8790);
const HUB = "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee", OPENER = "0x536adD8F30f03b69f6fbF29d425A816A0dC50106";
const FACTORY = "0x1f09DAeFA827f02CBb40967cc91b259763760761";
const USDT0 = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736", BEM = "0x60e62Efa9405d6873C5deaBD4E6CC91c25363952";
const POOLS = { [USDT0]: "0x0cbe0dbe1400e57f371a38bd3b9bc80f7c3676da", [BEM]: "0x2ccf8aa17f5df9fb5d51c9de12135a913ff29f7a" };
// Hardhat's well-known local test accounts (local copy only). #0 and #1 act as two people in the browser.
const KEYS = ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804e4ab365a", "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"];

const p = new JsonRpcProvider(RPC, 196, { staticNetwork: true, cacheTimeout: -1 });
const art = (n: string) => JSON.parse(readFileSync(new URL(`../../contracts/artifacts/contracts/${n}.sol/${n}.json`, import.meta.url), "utf8"));
const circuit = (n: string) => JSON.parse(readFileSync(new URL(`../../circuits/build/${n}.json`, import.meta.url), "utf8"));
const CPU_ABI = ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)", "function transistors() view returns (address)",
  "function TAPEOUT_FEE() view returns (uint256)", "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)"];

const [personA, personB, deployer, operator] = KEYS.map((k) => new Wallet(k, p));
const cpuAddr: string = await new Contract(FACTORY, ["function cpuAt(uint256) view returns (address)"], p).cpuAt(222);
for (const w of [personA, personB, deployer, operator]) await p.send("hardhat_setBalance", [w.address, "0x56BC75E2D63100000"]);

async function tapeout(s: Wallet, c: any): Promise<bigint> {
  const cpu = new Contract(cpuAddr, CPU_ABI, s);
  const tr = new Contract(await cpu.transistors(), ["function mint(uint256,uint256) payable", "function mintPrice() view returns (uint256)"], s);
  const gates = (c.netlist.length - 2) / 14;
  let lo = (await tr.mintPrice()) * BigInt(gates), hi = lo + 10n ** 16n;
  while (hi - lo > 10n ** 9n) { const mid = (lo + hi) / 2n; try { await tr.mint.staticCall(0, gates, { value: mid }); hi = mid; } catch { lo = mid; } }
  await (await tr.mint(0, gates, { value: hi })).wait();
  const rc = await (await cpu.tapeout(c.netlist, c.nIn, c.nOut, { value: await cpu.TAPEOUT_FEE() })).wait();
  return rc!.logs.map((l: any) => { try { return cpu.interface.parseLog(l); } catch { return null; } }).find((x: any) => x?.name === "Transfer")!.args.tokenId;
}
async function openContainer(s: Wallet, id: bigint): Promise<string> {
  const o = new Contract(OPENER, ["function open(address,uint256) payable", "function FEE() view returns (uint256)", "function accountOf(address,uint256) view returns (address)"], s);
  await (await o.open(cpuAddr, id, { value: await o.FEE() })).wait();
  return o.accountOf(cpuAddr, id);
}
async function fund(token: string, to: string, amount: bigint) {
  const pool = POOLS[token];
  await p.send("hardhat_impersonateAccount", [pool]); await p.send("hardhat_setBalance", [pool, "0x56BC75E2D63100000"]);
  await (await new Contract(token, ["function transfer(address,uint256) returns (bool)"], new JsonRpcSigner(p, pool)).transfer(to, amount)).wait();
}

const deployBlock = await p.getBlockNumber();
const budgetId = await tapeout(deployer, circuit("budget")), resaleId = await tapeout(deployer, circuit("resale"));
const deploy = async (n: string, args: unknown[]) => { const a = art(n); const c = await new ContractFactory(a.abi, a.bytecode, deployer).deploy(...args); await c.waitForDeployment(); return c as any; };
const registry = await deploy("AgentRegistry", [FACTORY]);
const budget = await deploy("AgentBudget", [await registry.getAddress(), cpuAddr, budgetId]);
const feeRecipient = Wallet.createRandom().address;
const market = await deploy("EvermoMarket", [await registry.getAddress(), cpuAddr, resaleId, feeRecipient, BEM, [USDT0, BEM]]);
await (await registry.bind(await budget.getAddress(), await market.getAddress())).wait();

const senderTok = await tapeout(operator, circuit("budget"));
await openContainer(operator, senderTok);
const base = `http://127.0.0.1:${PORT}`;
const agents: any[] = [];
for (const [slug, kind, who] of [["position-watch", "positionWatch", personA], ["token-risk-check", "tokenRiskCheck", personB]] as const) {
  const tok = await tapeout(who, circuit("budget"));
  const container = await openContainer(who, tok);
  const reg = registry.connect(who) as any;
  await (await reg.register(cpuAddr, tok, `${base}/a/${slug}`)).wait();
  const agentId = await registry.agentIdOf(cpuAddr, tok);
  agents.push({ slug, kind, who, tok, container, agentId });
}
for (const w of [personA, personB]) { await fund(USDT0, w.address, parseUnits("100", 6)); await fund(BEM, w.address, parseUnits("1000", 8)); }

const dir = mkdtempSync(join(tmpdir(), "evermo-dev-"));
const agentsFile = join(dir, "agents.json");
writeFileSync(agentsFile, JSON.stringify(agents.map((a) => ({ slug: a.slug, kind: a.kind, circuits: cpuAddr, tokenId: a.tok.toString(), priceUsdt: "0.01",
  sender: { circuits: cpuAddr, tokenId: senderTok.toString() } }))));
const env = { ...process.env, XLAYER_RPC_URL: RPC, REGISTRY_ADDRESS: await registry.getAddress(), BUDGET_ADDRESS: await budget.getAddress(),
  MARKET_ADDRESS: await market.getAddress(), DEPLOY_BLOCK: String(deployBlock), OPERATOR_KEY: operator.privateKey, PUBLIC_URL: base,
  AGENTS_FILE: agentsFile, DATA_DIR: join(dir, "data"), FEE_PAYEE: feeRecipient, PORT: String(PORT), WATCH_EVERY_MINUTES: "1" };
const svc = spawn("npx", ["tsx", "src/server.ts"], { cwd: new URL("..", import.meta.url).pathname, env, stdio: "inherit" });
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${base}/health`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 1000)); }

// Each builder switches their agent on through the service, as the app will.
const now = (await p.getBlock("latest"))!.timestamp;
for (const a of agents) {
  const expires = now + 180 * 86400;
  await fetch(`${base}/a/${a.slug}/delegation`, { method: "POST", body: JSON.stringify({ expires, sig: await signDelegation(a.who, 196, HUB, a.container, operator.address, expires) }) });
}

const deployment = {
  network: "local copy of X Layer", chainId: 196, rpc: RPC, explorer: "https://www.oklink.com/xlayer", service: base,
  registry: await registry.getAddress(), budget: await budget.getAddress(), market: await market.getAddress(),
  processor: cpuAddr, budgetCircuitId: budgetId.toString(), resaleCircuitId: resaleId.toString(),
  operator: operator.address, feeRecipient, hub: HUB, opener: OPENER, factory: FACTORY,
  tokens: [{ symbol: "USDT0", address: USDT0, decimals: 6 }, { symbol: "BEM", address: BEM, decimals: 8 }],
  tapesendApp: "https://www.tapesend.com",
};
writeFileSync(new URL("../../app/public/deployment.json", import.meta.url), JSON.stringify(deployment, null, 2));
console.log("\nReady. People in the browser: A", personA.address, " B", personB.address);
process.on("SIGINT", () => { svc.kill(); process.exit(0); });
