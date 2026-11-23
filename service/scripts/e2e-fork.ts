// End-to-end run on a local copy of X Layer mainnet (real TapeOut, TapeSend hub, Aave, USDT0):
// an owner switches an agent on, uses it, pays from its budget under the budget circuit, gets a track record and an
// encrypted alert in the agent's inbox; after a sale the old owner's permission and delegation stop working.
//
// Needs a forked node:  cd contracts && npx hardhat node --network xfork
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { Contract, ContractFactory, JsonRpcProvider, JsonRpcSigner, Wallet, getBytes, hexlify, parseEther, parseUnits } from "ethers";
import { x25519 } from "@noble/curves/ed25519.js";
import { recover } from "../src/tap13.ts";
import { ownerDigest, OWNER_HEADER } from "../src/auth.ts";
import { signDelegation, delegationSigner } from "../src/manifest.ts";
import { open as openSealed, endpointID } from "../src/tapesend.ts";

const RPC = process.env.FORK_RPC ?? "http://127.0.0.1:8545";
const LIVE = "https://rpc.xlayer.tech";
const HUB = "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee";
const OPENER = "0x536adD8F30f03b69f6fbF29d425A816A0dC50106";
const FACTORY = "0x1f09DAeFA827f02CBb40967cc91b259763760761";
const USDT0 = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
const USDT0_POOL = "0x0cbe0dbe1400e57f371a38bd3b9bc80f7c3676da";
const AAVE = "0xE3F3Caefdd7180F884c01E57f65Df979Af84f116";
const PORT = 8799;

const p = new JsonRpcProvider(RPC, 196, { staticNetwork: true, cacheTimeout: -1 });
const live = new JsonRpcProvider(LIVE, 196, { staticNetwork: true });
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info = "") => { results.push([name, ok, info]); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };
const art = (n: string) => JSON.parse(readFileSync(new URL(`../../contracts/artifacts/contracts/${n}.sol/${n}.json`, import.meta.url), "utf8"));
const circuit = (n: string) => JSON.parse(readFileSync(new URL(`../../circuits/build/${n}.json`, import.meta.url), "utf8"));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function funded(): Promise<Wallet> {
  const w = Wallet.createRandom().connect(p) as unknown as Wallet;
  await p.send("hardhat_setBalance", [w.address, "0x56BC75E2D63100000"]);
  return w;
}

const CPU_ABI = ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function transistors() view returns (address)", "function TAPEOUT_FEE() view returns (uint256)",
  "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)",
  "function transferFrom(address,address,uint256)", "function ownerOf(uint256) view returns (address)"];

async function main() {
  const cpuAddr: string = await new Contract(FACTORY, ["function cpuAt(uint256) view returns (address)"], p).cpuAt(222);
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
  async function openContainer(s: Wallet, id: bigint) {
    const o = new Contract(OPENER, ["function open(address,uint256) payable", "function FEE() view returns (uint256)", "function accountOf(address,uint256) view returns (address)"], s);
    await (await o.open(cpuAddr, id, { value: await o.FEE() })).wait();
    return o.accountOf(cpuAddr, id) as Promise<string>;
  }

  const deployBlock = await p.getBlockNumber();
  const deployer = await funded(), owner = await funded(), buyer = await funded(), operator = await funded(), payee = Wallet.createRandom();
  const budgetC = circuit("budget"), resaleC = circuit("resale");
  const budgetId = await tapeout(deployer, budgetC), resaleId = await tapeout(deployer, resaleC);
  const deploy = async (n: string, args: unknown[]) => { const a = art(n); const c = await new ContractFactory(a.abi, a.bytecode, deployer).deploy(...args); await c.waitForDeployment(); return c as any; };
  const registry = await deploy("AgentRegistry", [FACTORY]);
  const budget = await deploy("AgentBudget", [await registry.getAddress(), cpuAddr, budgetId]);
  const market = await deploy("EvermoMarket", [await registry.getAddress(), cpuAddr, resaleId, payee.address, "0x60e62efa9405d6873c5deabd4e6cc91c25363952", [USDT0]]);
  await (await registry.bind(await budget.getAddress(), await market.getAddress())).wait();

  // The owner's agent: its own circuit and container. Evermo's sender identity: the operator's own circuit and container.
  const agentTok = await tapeout(owner, budgetC);
  const container = await openContainer(owner, agentTok);
  const senderTok = await tapeout(operator, budgetC);
  const senderContainer = await openContainer(operator, senderTok);
  const reg = registry.connect(owner) as any;
  await (await reg.register(cpuAddr, agentTok, `http://127.0.0.1:${PORT}/a/position-watch`)).wait();
  const agentId = await registry.agentIdOf(cpuAddr, agentTok);
  check("agent registered with its own circuit and container", (await registry.holderOf(agentId)) === owner.address, container);

  // Owner switches on: permission for the operator, limits, payee, budget.
  const now = (await p.getBlock("latest"))!.timestamp;
  await (await reg.setPermission(agentId, operator.address, now + 30 * 86400)).wait();
  await (await reg.setLimits(agentId, USDT0, parseUnits("0.5", 6), parseUnits("2", 6))).wait();
  await (await reg.setPayee(agentId, payee.address, true)).wait();
  await p.send("hardhat_impersonateAccount", [USDT0_POOL]); await p.send("hardhat_setBalance", [USDT0_POOL, "0x56BC75E2D63100000"]);
  const usdt = (s: any) => new Contract(USDT0, ["function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"], s);
  await (await usdt(new JsonRpcSigner(p, USDT0_POOL)).transfer(owner.address, parseUnits("5", 6))).wait();
  await (await usdt(owner).approve(await budget.getAddress(), parseUnits("1", 6))).wait();
  await (await (budget.connect(owner) as any).deposit(agentId, USDT0, parseUnits("1", 6))).wait();

  // Owner publishes an inbox key (TAP-10) so alerts can be sealed to them.
  let r: Uint8Array, R: Uint8Array;
  do { r = new Uint8Array(randomBytes(32)); R = x25519.getPublicKey(r); } while (R[31] & 0x80);
  const hub = new Contract(HUB, ["function publishKey(address,uint256,uint8,uint16,bytes32,uint64)",
    "event Sent(bytes32 indexed to, address indexed from, bytes32 indexed ref, uint256 inboxIndex, uint256 outboxIndex, bytes payload)"], owner);
  await (await hub.publishKey(cpuAddr, agentTok, 1, 0, hexlify(R), 4)).wait();

  // A real Aave borrower on X Layer, found from recent Borrow events on the live chain.
  const borrowTopic = "0xb3d084820fb1a9decffb176436bd02558d15fac9b0ddfed8c465bc7359d7dce0";
  let borrower = ""; const head = await live.getBlockNumber();
  for (let i = 0; i < 300 && !borrower; i++) {
    const logs = await live.getLogs({ address: AAVE, topics: [borrowTopic], fromBlock: head - (i + 1) * 100 + 1, toBlock: head - i * 100 });
    if (logs.length) borrower = "0x" + logs[0].topics[2].slice(26);
  }
  check("found a real borrower on Aave on X Layer", borrower !== "", borrower);

  // Start the service against the local copy.
  const dir = mkdtempSync(join(tmpdir(), "evermo-"));
  const agentsFile = join(dir, "agents.json");
  writeFileSync(agentsFile, JSON.stringify([
    { slug: "position-watch", kind: "positionWatch", circuits: cpuAddr, tokenId: agentTok.toString(), priceUsdt: "0.01", sender: { circuits: cpuAddr, tokenId: senderTok.toString() } },
  ]));
  const env = { ...process.env, XLAYER_RPC_URL: RPC, REGISTRY_ADDRESS: await registry.getAddress(), BUDGET_ADDRESS: await budget.getAddress(), MARKET_ADDRESS: await market.getAddress(), DEPLOY_BLOCK: String(deployBlock),
    OPERATOR_KEY: operator.privateKey, PUBLIC_URL: `http://127.0.0.1:${PORT}`, AGENTS_FILE: agentsFile, DATA_DIR: join(dir, "data"),
    FEE_PAYEE: payee.address, PORT: String(PORT), WATCH_EVERY_MINUTES: "0.05" };
  const svc = spawn("npx", ["tsx", "src/server.ts"], { cwd: new URL("..", import.meta.url).pathname, env, stdio: ["ignore", "inherit", "inherit"] });
  const base = `http://127.0.0.1:${PORT}/a/position-watch`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch { /* starting */ } await wait(1000); }

  try {
    check("manifest is not served before the owner switches the agent on", (await fetch(base + "/.well-known/tapeapi.json")).status === 404);
    const expires = now + 90 * 86400;
    const signerAddr = operator.address;
    const sig = await signDelegation(owner, 196, HUB, container, signerAddr, expires);
    const d = await fetch(base + "/delegation", { method: "POST", body: JSON.stringify({ expires, sig }) });
    check("owner's signed delegation accepted", d.ok);
    const man = await (await fetch(base + "/.well-known/tapeapi.json")).json();
    check("manifest names the container, signer and a delegation from the current owner",
      man.container === container && man.signer === signerAddr && delegationSigner(196, HUB, container, signerAddr, man.delegation.expires, man.delegation.sig) === owner.address);
    check("manifest pins the tools and lists AI prices read from the provider", /^[0-9a-f]{64}$/.test(man.mcp.toolsSha256) && man.ai.models[0].prices[0].currency === "USD", JSON.stringify(man.ai.models[0]));

    // Free call: signed answer, nothing charged or recorded.
    const params = { account: borrower, warnBelow: "1000" };
    const free = await (await fetch(base + "/health", { method: "POST", body: JSON.stringify({ id: "free-1", params }) })).json();
    check("free call gives a signed answer", free.ok && recover(free, "health", params) === signerAddr, `health ${free.result?.healthFactor}`);

    // Owner call: charged under the budget circuit and recorded.
    const ts = Math.floor(Date.now() / 1000);
    const ownerSig = await owner.signMessage(getBytes(ownerDigest(agentId, "own-1", "health", params, ts)));
    const res = await fetch(base + "/health", { method: "POST", headers: { [OWNER_HEADER]: `${ts}.${ownerSig}` }, body: JSON.stringify({ id: "own-1", params }) });
    const env1 = await res.json();
    const pay = JSON.parse(res.headers.get("x-evermo-payment") ?? "{}");
    check("owner call is signed, paid from the budget and allowed by the budget circuit", env1.ok && recover(env1, "health", params) === signerAddr && pay.allowed === true, JSON.stringify(pay));
    check("payee received the payment", (await usdt(p).balanceOf(payee.address)) === parseUnits("0.01", 6));
    const rec1 = await registry.recordOf(agentId);
    check("work and payment are in the agent's track record", rec1.work === 1n && rec1.payments === 1n, `work ${rec1.work}, payments ${rec1.payments}`);

    // Position Watch: alert sealed to the owner's inbox key.
    const ts2 = Math.floor(Date.now() / 1000);
    const wsig = await owner.signMessage(getBytes(ownerDigest(agentId, "w-1", "watch", params, ts2)));
    const w = await fetch(base + "/watch", { method: "POST", headers: { [OWNER_HEADER]: `${ts2}.${wsig}` }, body: JSON.stringify({ id: "w-1", ...params }) });
    check("owner sets a watch", w.ok);
    const to = endpointID(196, container);
    const fromBlock = await p.getBlockNumber();
    let msg: any = null;
    for (let i = 0; i < 40 && !msg; i++) {
      await wait(2000);
      const logs = await p.getLogs({ address: HUB, topics: [hub.interface.getEvent("Sent")!.topicHash, hexlify(to)], fromBlock, toBlock: "latest" });
      if (logs.length) {
        const ev = hub.interface.parseLog(logs[0])!;
        msg = openSealed(r!, getBytes(ev.args.payload), to, endpointID(196, senderContainer), getBytes(ev.args.ref), HUB);
      }
    }
    check("alert arrives encrypted in the agent's inbox and only the owner's key opens it", msg?.subject === "Lending health warning", msg?.body?.split("\n")[0]);

    // What the app reads: the list, the agent's history and the live feed.
    const live: any[] = [];
    const ctl = new AbortController();
    void fetch(`http://127.0.0.1:${PORT}/live`, { signal: ctl.signal }).then(async (r) => {
      const rd = r.body!.getReader(); let buf = "";
      for (;;) { const { value, done } = await rd.read(); if (done) break; buf += new TextDecoder().decode(value);
        for (const part of buf.split("\n\n").slice(0, -1)) if (part.startsWith("data: ")) live.push(JSON.parse(part.slice(6)));
        buf = buf.split("\n\n").pop()!; }
    }).catch(() => {});
    await wait(1000);
    let list: any = null;
    for (let i = 0; i < 20; i++) { list = await (await fetch(`http://127.0.0.1:${PORT}/agents`)).json(); if (list.agents?.[0]?.record.work >= 2) { await wait(8000); list = await (await fetch(`http://127.0.0.1:${PORT}/agents`)).json(); break; } await wait(1500); }
    const card = list.agents[0];
    check("agent list shows name, owner and record (one call, one alert: no duplicates)", card?.name === "Position Watch" && card.owner === owner.address && card.record.work === 2 && card.record.payments === 2 && card.switchedOn === true, JSON.stringify(card?.record));
    const hist = await (await fetch(`http://127.0.0.1:${PORT}/agents/${agentId}/history`)).json();
    const names = hist.items.map((x: any) => x.name);
    check("history lists registration, deposit, budget decisions and work, each with its transaction",
      ["AgentRegistered", "Deposited", "PaymentDecided", "Recorded"].every((n) => names.includes(n)) && hist.items.every((x: any) => /^0x[0-9a-f]{64}$/.test(x.tx)), names.join(", "));

    // A payment above the owner's per-payment limit: the budget circuit refuses it on chain.
    const big = await (budget.connect(operator) as any).pay(agentId, USDT0, payee.address, parseUnits("0.9", 6), "0x" + "11".repeat(32));
    await big.wait();
    check("budget circuit refuses a payment above the owner's limit and it is recorded", (await registry.recordOf(agentId)).blocked === 1n);

    // Sale: the agent changes hands. The old owner's permission and delegation stop working.
    await (await new Contract(cpuAddr, CPU_ABI, owner).transferFrom(owner.address, buyer.address, agentTok)).wait();
    check("after the sale the manifest is withdrawn until the new owner switches it on", (await fetch(base + "/.well-known/tapeapi.json")).status === 404);
    check("old owner's operator permission stopped", (await registry.permissionValid(agentId, operator.address)) === false);
    const ts3 = Math.floor(Date.now() / 1000);
    const oldSig = await owner.signMessage(getBytes(ownerDigest(agentId, "own-2", "health", params, ts3)));
    const old = await (await fetch(base + "/health", { method: "POST", headers: { [OWNER_HEADER]: `${ts3}.${oldSig}` }, body: JSON.stringify({ id: "own-2", params }) })).json();
    for (let i = 0; i < 10 && !live.some((x) => x.name === "PaymentDecided" && x.data.allowed === false); i++) await wait(1500);
    ctl.abort();
    check("live feed reports new events as they happen, including a payment the circuit refused", live.length > 0, live.map((x) => x.name + (x.name === "PaymentDecided" ? `(${x.data.allowed})` : "")).join(", "));
    check("old owner can no longer spend the agent's budget", old.ok === false && old.error.code === "BAD_REQUEST", old.error?.message);
  } finally {
    svc.kill();
  }
  const failed = results.filter((x) => !x[1]).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
