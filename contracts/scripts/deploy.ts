// Deploys Evermo to X Layer: tapes out the budget and resale circuits, deploys the three contracts, creates each agent's
// identity (a one-gate circuit and its opened container) and registers it, and optionally creates Evermo's sender
// identity for encrypted alerts and hands it to the operator.
//
// Every step is saved to deployments/<name>.json as soon as it is confirmed, so a run that stops can be started again
// and picks up where it left off without paying twice. Before spending anything it prints the plan and the cost read
// from the TapeOut contracts, and checks the wallet balance. On mainnet nothing is sent without CONFIRM=yes.
//
//   DEPLOYER_KEY=… OPERATOR_ADDRESS=0x… FEE_RECIPIENT=0x… OWNER_ADDRESS=0x… (gets the agents and the OKB left over) SERVICE_URL=https://… AGENTS=positionWatch,tokenRiskCheck ALERTS=yes \
//   NAME=xlayer [XLAYER_RPC_URL=…] [CONFIRM=yes] npx tsx scripts/deploy.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Contract, ContractFactory, JsonRpcProvider, Wallet, formatEther, getAddress, isAddress } from "ethers";

const X = {
  chainId: 196, factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761", opener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
  hub: "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee", processorNumber: 222,
  usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736", bem: "0x60e62Efa9405d6873C5deaBD4E6CC91c25363952",
};
const SLUGS: Record<string, string> = { positionWatch: "position-watch", tokenRiskCheck: "token-risk-check" };
// The smallest well-formed circuit (TAP-02), one gate: an agent's identity only needs to exist.
const IDENTITY = { netlist: "0x00000002000002", nIn: 1, nOut: 1 };

const env = (k: string, d?: string) => { const v = process.env[k] ?? d; if (v === undefined) throw new Error(`Missing ${k}`); return v; };
const rpcUrl = env("XLAYER_RPC_URL", "https://rpc.xlayer.tech");
const name = env("NAME", "xlayer");
const p = new JsonRpcProvider(rpcUrl, X.chainId, { staticNetwork: true, cacheTimeout: -1 });
const me = new Wallet(env("DEPLOYER_KEY"), p);
const operator = getAddress(env("OPERATOR_ADDRESS"));
const feeRecipient = getAddress(env("FEE_RECIPIENT"));
const serviceUrl = env("SERVICE_URL").replace(/\/$/, "");
const agentKinds = env("AGENTS", "positionWatch,tokenRiskCheck").split(",").map((s) => s.trim()).filter(Boolean);
const alerts = env("ALERTS", "yes") === "yes";
for (const k of agentKinds) if (!SLUGS[k]) throw new Error(`Unknown agent ${k}`);
if (!isAddress(operator) || !isAddress(feeRecipient)) throw new Error("Bad address");

const root = new URL("../../", import.meta.url);
const art = (n: string) => JSON.parse(readFileSync(new URL(`contracts/artifacts/contracts/${n}.sol/${n}.json`, root), "utf8"));
const circuit = (n: string) => JSON.parse(readFileSync(new URL(`circuits/build/${n}.json`, root), "utf8"));
const stateFile = new URL(`deployments/${name}.json`, root);
mkdirSync(new URL("deployments/", root), { recursive: true });
const state: Record<string, any> = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");

async function step<T>(key: string, label: string, f: () => Promise<T>): Promise<T> {
  if (state[key] !== undefined) { console.log(`  done   ${label}`); return state[key]; }
  process.stdout.write(`  ...    ${label}`);
  const v = await f();
  state[key] = v; save();
  console.log(`\r  ok     ${label}${typeof v === "string" ? "  " + v : ""}`);
  return v;
}

const cpuAbi = ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)", "function transistors() view returns (address)",
  "function TAPEOUT_FEE() view returns (uint256)", "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)",
  "function ownerOf(uint256) view returns (address)", "function transferFrom(address,address,uint256)"];
const cpuAddr: string = await new Contract(X.factory, ["function cpuAt(uint256) view returns (address)"], p).cpuAt(X.processorNumber);
const cpu = new Contract(cpuAddr, cpuAbi, me);
const tr = new Contract(await cpu.transistors(), ["function mint(uint256,uint256) payable", "function mintPrice() view returns (uint256)"], me);
const opener = new Contract(X.opener, ["function open(address,uint256) payable", "function FEE() view returns (uint256)",
  "function accountOf(address,uint256) view returns (address)", "function isOpened(address,uint256) view returns (bool)"], me);

/** The exact value the transistor contract accepts for `n` transistors right now (it charges a fixed part per mint plus a
 *  price per transistor), found by asking the contract, never assumed. */
async function mintValue(n: number): Promise<bigint> {
  let lo = (await tr.mintPrice()) * BigInt(n), hi = lo + 10n ** 16n;
  try { await tr.mint.staticCall(0, n, { value: hi }); } catch { throw new Error("Transistors cost more than expected; stopping before spending"); }
  while (hi - lo > 10n ** 9n) { const mid = (lo + hi) / 2n; try { await tr.mint.staticCall(0, n, { value: mid }); hi = mid; } catch { lo = mid; } }
  return hi;
}
async function tapeout(c: { netlist: string; nIn: number; nOut: number }): Promise<string> {
  const gates = (c.netlist.length - 2) / 14;
  await (await tr.mint(0, gates, { value: await mintValue(gates) })).wait();
  const rc = await (await cpu.tapeout(c.netlist, c.nIn, c.nOut, { value: await cpu.TAPEOUT_FEE() })).wait();
  const ev = rc!.logs.filter((l: any) => l.address.toLowerCase() === cpuAddr.toLowerCase()).map((l: any) => { try { return cpu.interface.parseLog(l); } catch { return null; } })
    .find((x: any) => x?.name === "Transfer" && x.args.to.toLowerCase() === me.address.toLowerCase());
  if (!ev) throw new Error("No new circuit in the tape-out receipt");
  return ev.args.tokenId.toString();
}
async function deploy(n: string, args: unknown[]): Promise<string> {
  const a = art(n); const c = await new ContractFactory(a.abi, a.bytecode, me).deploy(...args); await c.waitForDeployment(); return c.getAddress();
}

// ---- Plan and cost ----
const [fee, tape, , bal, net] = await Promise.all([opener.FEE(), cpu.TAPEOUT_FEE(), tr.mintPrice(), p.getBalance(me.address), p.getNetwork()]);
const budgetC = circuit("budget"), resaleC = circuit("resale");
const identities = agentKinds.length + (alerts ? 1 : 0);
const [mintBudget, mintResale, mintOne] = await Promise.all([mintValue(budgetC.gates), mintValue(resaleC.gates), mintValue(1)]);
// Only what is still to be done costs anything.
const ids = [...agentKinds.map((k) => `agent.${k}`), ...(alerts ? ["sender"] : [])];
const cost = (state.budgetCircuitId ? 0n : tape + mintBudget) + (state.resaleCircuitId ? 0n : tape + mintResale)
  + ids.reduce((sum, k) => sum + (state[`${k}.tokenId`] ? 0n : tape + mintOne) + (state[`${k}.opened`] ? 0n : fee), 0n);
void identities;
const operatorGas = BigInt(Math.round(Number(env("OPERATOR_GAS", "0.006")) * 1e18)); // for recording work, alerts and the site upload
const gasReserve = 10n ** 15n + (state.operatorFunded ? 0n : operatorGas); // 0.001 OKB for gas at today's 0.02 gwei is many times what the run uses
console.log(`\nEvermo deployment "${name}" on chain ${net.chainId} via ${rpcUrl}`);
console.log(`  deployer        ${me.address}  balance ${formatEther(bal)} OKB`);
console.log(`  operator        ${operator}`);
console.log(`  fee recipient   ${feeRecipient}`);
console.log(`  service         ${serviceUrl}`);
console.log(`  agents          ${agentKinds.join(", ")}${alerts ? " + sender identity for alerts" : ""}`);
console.log(`  TapeOut prices  container ${formatEther(fee)}, tape-out ${formatEther(tape)}, one-gate mint ${formatEther(mintOne)}, budget mint ${formatEther(mintBudget)}, resale mint ${formatEther(mintResale)} OKB`);
console.log(`  cost            ${formatEther(cost)} OKB to TapeOut for the steps still to do, + ${formatEther(gasReserve)} OKB for gas (incl. the operator's)`);
if (bal < cost + gasReserve && !state.done) throw new Error(`Not enough OKB: need about ${formatEther(cost + gasReserve)}, have ${formatEther(bal)}`);
if (rpcUrl.includes("rpc.xlayer.tech") && process.env.CONFIRM !== "yes") { console.log("\nMainnet: nothing sent. Run again with CONFIRM=yes to deploy.\n"); process.exit(0); }

// ---- Run ----
console.log("");
state.processor = cpuAddr;
state.deployBlock ??= await p.getBlockNumber(); // the indexer starts here
save();
const budgetId = await step("budgetCircuitId", "tape out the budget circuit", () => tapeout(budgetC));
const resaleId = await step("resaleCircuitId", "tape out the resale circuit", () => tapeout(resaleC));
const registry = await step("registry", "deploy AgentRegistry", () => deploy("AgentRegistry", [X.factory]));
const budget = await step("budget", "deploy AgentBudget", () => deploy("AgentBudget", [registry, cpuAddr, budgetId]));
const market = await step("market", "deploy EvermoMarket", () => deploy("EvermoMarket", [registry, cpuAddr, resaleId, feeRecipient, X.bem, [X.usdt0, X.bem]]));
const reg = new Contract(registry, ["function bind(address,address)", "function budget() view returns (address)", "function agentIdOf(address,uint256) pure returns (bytes32)",
  "function register(address,uint256,string)"], me);
await step("bound", "bind the budget and market contracts", async () => {
  if ((await reg.budget()) === "0x0000000000000000000000000000000000000000") await (await reg.bind(budget, market)).wait();
  return true;
});

state.agents ??= {};
for (const kind of agentKinds) {
  const slug = SLUGS[kind];
  const tokenId = await step(`agent.${kind}.tokenId`, `create the identity of ${slug}`, () => tapeout(IDENTITY));
  await step(`agent.${kind}.opened`, `open the wallet of ${slug}`, async () => {
    if (!(await opener.isOpened(cpuAddr, tokenId))) await (await opener.open(cpuAddr, tokenId, { value: fee })).wait();
    return opener.accountOf(cpuAddr, tokenId);
  });
  await step(`agent.${kind}.agentId`, `register ${slug} on Evermo`, async () => {
    await (await reg.register(cpuAddr, tokenId, `${serviceUrl}/a/${slug}`)).wait();
    return reg.agentIdOf(cpuAddr, tokenId);
  });
}
if (alerts) {
  const tokenId = await step("sender.tokenId", "create Evermo's sender identity", () => tapeout(IDENTITY));
  await step("sender.opened", "open its wallet", async () => {
    if (!(await opener.isOpened(cpuAddr, tokenId))) await (await opener.open(cpuAddr, tokenId, { value: fee })).wait();
    return opener.accountOf(cpuAddr, tokenId);
  });
  await step("sender.toOperator", "hand it to the operator", async () => {
    if ((await cpu.ownerOf(tokenId)).toLowerCase() !== operator.toLowerCase()) await (await cpu.transferFrom(me.address, operator, tokenId)).wait();
    return true;
  });
}
await step("operatorFunded", `give the operator ${formatEther(operatorGas)} OKB for gas`, async () => {
  if (operatorGas > 0n) await (await me.sendTransaction({ to: operator, value: operatorGas })).wait();
  return true;
});
// The agents go to their real owner's wallet, so no private key of the owner is ever needed here.
const finalOwner = process.env.OWNER_ADDRESS ? getAddress(process.env.OWNER_ADDRESS) : null;
if (finalOwner) for (const kind of agentKinds) {
  const tokenId = state[`agent.${kind}.tokenId`];
  const holder = (await cpu.ownerOf(tokenId)).toLowerCase();
  if (holder !== me.address.toLowerCase() && holder !== finalOwner.toLowerCase()) { console.log(`  skip   ${SLUGS[kind]} is held by ${holder} (listed or moved), not handed over`); continue; }
  await step(`agent.${kind}.toOwner`, `hand ${SLUGS[kind]} to ${finalOwner}`, async () => {
    if (holder !== finalOwner.toLowerCase()) await (await cpu.transferFrom(me.address, finalOwner, tokenId)).wait();
    return true;
  });
}
// Whatever OKB is left goes back to the owner (or a REFUND_ADDRESS), keeping only enough for this transaction.
const refundTo = process.env.REFUND_ADDRESS ? getAddress(process.env.REFUND_ADDRESS) : finalOwner;
if (refundTo) {
  const left = await p.getBalance(me.address), gp = (await p.getFeeData()).gasPrice ?? 0n, keep = gp * 21000n * 2n;
  if (left > keep) { await (await me.sendTransaction({ to: refundTo, value: left - keep, gasLimit: 21000n, gasPrice: gp })).wait(); console.log(`  ok     returned ${formatEther(left - keep)} OKB to ${refundTo}`); }
}
state.done = true; save();

// ---- Files the app and the service read ----
const appDeployment = {
  network: "X Layer", chainId: X.chainId, rpc: "https://rpc.xlayer.tech", explorer: "https://www.oklink.com/xlayer", service: serviceUrl,
  registry, budget, market, deployBlock: state.deployBlock, processor: cpuAddr, budgetCircuitId: budgetId, resaleCircuitId: resaleId,
  operator, feeRecipient, hub: X.hub, opener: X.opener, factory: X.factory,
  tokens: [{ symbol: "USDT0", address: X.usdt0, decimals: 6 }, { symbol: "BEM", address: X.bem, decimals: 8 }],
  tapesendApp: "https://www.tapesend.com",
};
const serviceAgents = agentKinds.map((kind) => ({ slug: SLUGS[kind], kind, circuits: cpuAddr, tokenId: state[`agent.${kind}.tokenId`], priceUsdt: env("PRICE_USDT", "0.01"),
  ...(alerts ? { sender: { circuits: cpuAddr, tokenId: state["sender.tokenId"] } } : {}) }));
writeFileSync(new URL(`deployments/${name}.app.json`, root), JSON.stringify(appDeployment, null, 2) + "\n");
writeFileSync(new URL(`deployments/${name}.agents.json`, root), JSON.stringify(serviceAgents, null, 2) + "\n");
console.log(`\nDone. Spent ${formatEther(bal - (await p.getBalance(me.address)))} OKB in this run.`);
console.log(`  deployments/${name}.json, ${name}.app.json (copy to app/public/deployment.json), ${name}.agents.json (the service's AGENTS_FILE)\n`);
