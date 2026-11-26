// x402 end to end on a local copy of X Layer (real USDT0, real TapeOut circuits), using the world set up by dev-fork.ts:
//  1. a stranger pays Token Risk Check per call over x402; the price lands with the agent's owner;
//  2. Position Watch buys from Token Risk Check out of its own budget, after the budget circuit allows the real seller;
//  3. with that seller no longer allowed, the circuit refuses and nothing is paid.
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, JsonRpcSigner, Wallet, getBytes, parseUnits, formatUnits } from "ethers";
import * as x402 from "../src/x402.ts";
import { ownerDigest, OWNER_HEADER } from "../src/auth.ts";
import { recover } from "../src/tap13.ts";

const RPC = process.env.FORK_RPC ?? "http://127.0.0.1:8545";
const dep = JSON.parse(readFileSync(new URL("../../app/public/deployment.json", import.meta.url), "utf8"));
const p = new JsonRpcProvider(RPC, 196, { staticNetwork: true, cacheTimeout: -1 });
const A = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", p); // owns Position Watch
const B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // owns Token Risk Check
const results: [string, boolean][] = [];
const check = (n: string, ok: boolean, info = "") => { results.push([n, ok]); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${info ? "  — " + info : ""}`); };
const usdt = new Contract(x402.USDT0, ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)"], p);
const agents = (await (await fetch(dep.service + "/agents")).json()).agents as any[];
const pw = agents.find((a) => a.name === "Position Watch"), trc = agents.find((a) => a.name === "Token Risk Check");
const paidUrl = `${dep.service}/a/token-risk-check/paid/check`;
const body = { id: "x402-1", params: { token: "0x60e62Efa9405d6873C5deaBD4E6CC91c25363952" } };

// 1. A stranger pays per call.
const stranger = Wallet.createRandom().connect(p);
const pool = "0x0cbe0dbe1400e57f371a38bd3b9bc80f7c3676da";
await p.send("hardhat_impersonateAccount", [pool]); await p.send("hardhat_setBalance", [pool, "0x56BC75E2D63100000"]);
await (await (usdt.connect(new JsonRpcSigner(p, pool)) as Contract).transfer(stranger.address, parseUnits("1", 6))).wait();
const r1 = await fetch(paidUrl, { method: "POST", body: JSON.stringify(body) });
const pr = x402.decode<x402.PaymentRequired>(r1.headers.get("payment-required") ?? "");
const want = x402.pick(pr)!;
check("unpaid request gets 402 with the price and the owner as payee", r1.status === 402 && want.payTo === B && want.amount === "10000", `${formatUnits(want.amount, 6)} USDT0 to ${want.payTo}`);
const b0 = await usdt.balanceOf(B);
const pay = await x402.signPayment(stranger as unknown as Wallet, want, pr.resource);
const r2 = await fetch(paidUrl, { method: "POST", headers: { "PAYMENT-SIGNATURE": x402.encode(pay) }, body: JSON.stringify(body) });
const env = await r2.json();
const settled = x402.decode<x402.SettleResponse>(r2.headers.get("payment-response") ?? "e30=");
check("paid request gets a signed answer and the owner is paid on chain", r2.ok && env.ok && (await usdt.balanceOf(B)) - b0 === 10000n && /^0x[0-9a-f]{64}$/.test(settled.transaction),
  `settlement ${settled.transaction.slice(0, 12)}…`);
const m = await (await fetch(`${dep.service}/a/token-risk-check/.well-known/tapeapi.json`)).json();
check("the paid answer is signed by the agent's approved signer", recover(env, "check", body.params) === m.signer);
const replay = await fetch(paidUrl, { method: "POST", headers: { "PAYMENT-SIGNATURE": x402.encode(pay) }, body: JSON.stringify(body) });
check("the same payment cannot be used twice", replay.status === 402);

// 2. Position Watch pays Token Risk Check from its budget.
const reg = new Contract(dep.registry, ["function setPermission(bytes32,address,uint64)", "function setLimits(bytes32,address,uint128,uint128)", "function setPayee(bytes32,address,bool)",
  "function recordOf(bytes32) view returns (tuple(uint64 work, uint64 payments, uint64 blocked, uint64 sales, uint256 lastSalePrice, address lastSaleToken))"], A);
const bud = new Contract(dep.budget, ["function deposit(bytes32,address,uint256)", "function balanceOf(bytes32,address) view returns (uint256)"], A);
const now = (await p.getBlock("latest"))!.timestamp;
await (await reg.setPermission(pw.agentId, dep.operator, now + 30 * 86400)).wait();
await (await reg.setLimits(pw.agentId, x402.USDT0, parseUnits("0.5", 6), parseUnits("2", 6))).wait();
await (await reg.setPayee(pw.agentId, B, true)).wait();
await (await (usdt.connect(A) as Contract).approve(dep.budget, parseUnits("1", 6))).wait();
await (await bud.deposit(pw.agentId, x402.USDT0, parseUnits("1", 6))).wait();
async function buy(id: string) {
  const params = { url: paidUrl, body: { id, params: body.params } }, ts = Math.floor(Date.now() / 1000);
  const sig = await A.signMessage(getBytes(ownerDigest(pw.agentId, id, "x402", params, ts)));
  return (await fetch(`${dep.service}/a/position-watch/buy-x402`, { method: "POST", headers: { [OWNER_HEADER]: `${ts}.${sig}` }, body: JSON.stringify({ id, ...params }) })).json();
}
const bal0 = await bud.balanceOf(pw.agentId, x402.USDT0), b1 = await usdt.balanceOf(B);
const bought = await buy("buy-1");
check("agent pays another agent from its budget after the circuit allows the real seller",
  bought.ok && bought.paid && bal0 - (await bud.balanceOf(pw.agentId, x402.USDT0)) === 10000n && (await usdt.balanceOf(B)) - b1 === 10000n && bought.response?.ok === true,
  `decision ${bought.decision?.slice(0, 12)}…, settlement ${bought.settlement?.transaction?.slice(0, 12)}…`);

// 3. Seller no longer allowed: refused on chain, nothing paid.
await (await reg.setPayee(pw.agentId, B, false)).wait();
const rec0 = await reg.recordOf(pw.agentId), b2 = await usdt.balanceOf(B);
const refused = await buy("buy-2");
const rec1 = await reg.recordOf(pw.agentId);
check("a seller the owner did not allow is refused by the circuit, and the refusal is recorded",
  refused.refused === true && rec1.blocked === rec0.blocked + 1n && (await usdt.balanceOf(B)) === b2, refused.error);

const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
