import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { setup, X } from "./helpers.ts";

const USDT = (n: number) => BigInt(Math.round(n * 1e6));
const BEM = (n: number) => BigInt(Math.round(n * 1e8));

describe("Evermo on a local copy of X Layer", async () => {
  let t: Awaited<ReturnType<typeof setup>>;
  let builder: any, owner: any, operator: any, buyer: any, buyer2: any, service: any;
  let agentTokenId: bigint, agentId: string;

  before(async () => {
    t = await setup();
    [, builder, owner, operator, buyer, service] = t.signers;
    buyer2 = t.signers[6];
    await t.p.send("hardhat_setBalance", [buyer2.address, "0x56BC75E2D63100000"]);
    agentTokenId = await t.tapeout(builder, "0x00000002000002", 1, 1); // the agent's identity circuit
    await t.fund(X.usdt0, X.usdt0Pool, owner.address, USDT(1000));
    await t.fund(X.usdt0, X.usdt0Pool, buyer.address, USDT(1000));
    await t.fund(X.bem, X.bemPool, buyer2.address, BEM(50));
  });

  it("taped-out circuits match the rules on every input", async () => {
    const cpu = t.cpuAs(t.signers[0]);
    for (let v = 0; v < 16; v++) {
      const b = (i: number) => (v >> i) & 1;
      const inp = "0x" + v.toString(16).padStart(2, "0");
      const budgetOut = Number(await cpu.eval(t.budgetId, inp)) & 1;
      assert.equal(budgetOut, b(0) && b(1) && !b(2) && !b(3) ? 1 : 0, `budget ${v}`);
      const resaleOut = Number(await cpu.eval(t.resaleId, inp));
      const allow = b(0) && b(1) && b(2) ? 1 : 0;
      assert.equal(resaleOut, allow | ((allow && !b(3) ? 1 : 0) << 1), `resale ${v}`);
    }
  });

  it("registers only real TapeOut circuits held by the caller", async () => {
    await assert.rejects(t.registry.connect(owner).register(t.cpuAddr, agentTokenId, "tape://x"));
    await assert.rejects(t.registry.connect(builder).register(X.usdt0, 1, "x"));
    await (await t.registry.connect(builder).register(t.cpuAddr, agentTokenId, `tape://${agentTokenId}.2.222.tape`)).wait();
    agentId = await t.registry.agentIdOf(t.cpuAddr, agentTokenId);
    assert.equal((await t.registry.agentOf(agentId)).builder, builder.address);
  });

  it("first sale: builder sells, Evermo takes 5%, no royalty", async () => {
    await (await t.cpuAs(builder).setApprovalForAll(await t.market.getAddress(), true)).wait();
    const expires = BigInt((await t.p.getBlock("latest"))!.timestamp + 86400);
    await (await t.market.connect(builder).list(agentId, X.usdt0, USDT(100), expires)).wait();
    const usdt = t.erc20(X.usdt0, owner);
    await (await usdt.approve(await t.market.getAddress(), USDT(100))).wait();
    const b0 = await t.erc20(X.usdt0, builder).balanceOf(builder.address);
    const f0 = await t.erc20(X.usdt0, builder).balanceOf(t.feeRecipient.address);
    await (await t.market.connect(owner).buy(0)).wait();
    assert.equal(await t.cpuAs(owner).ownerOf(agentTokenId), owner.address);
    assert.equal((await t.erc20(X.usdt0, builder).balanceOf(builder.address)) - b0, USDT(95));
    assert.equal((await t.erc20(X.usdt0, builder).balanceOf(t.feeRecipient.address)) - f0, USDT(5));
    assert.equal((await t.registry.recordOf(agentId)).sales, 1n);
  });

  it("budget: the circuit allows payments within the owner's limits and blocks the rest", async () => {
    const token = X.usdt0;
    const r = t.registry.connect(owner);
    const expires = BigInt((await t.p.getBlock("latest"))!.timestamp + 7 * 86400);
    await (await r.setPermission(agentId, operator.address, expires)).wait();
    await (await r.setLimits(agentId, token, USDT(2), USDT(3))).wait();
    await (await r.setPayee(agentId, service.address, true)).wait();
    await (await t.erc20(token, owner).approve(await t.budget.getAddress(), USDT(10))).wait();
    await (await t.budget.connect(owner).deposit(agentId, token, USDT(10))).wait();

    const s0 = await t.erc20(token, owner).balanceOf(service.address);
    await (await t.budget.connect(operator).pay(agentId, token, service.address, USDT(2), "0x" + "11".repeat(32))).wait();
    assert.equal((await t.erc20(token, owner).balanceOf(service.address)) - s0, USDT(2));

    // over the per-payment limit
    const [, overPayment] = await t.budget.check(agentId, operator.address, token, service.address, USDT(2.5));
    assert.equal(overPayment, false);
    // over the daily limit (2 already spent, daily 3)
    const [, overDaily] = await t.budget.check(agentId, operator.address, token, service.address, USDT(1.5));
    assert.equal(overDaily, false);
    // payee not allowed
    const [, badPayee] = await t.budget.check(agentId, operator.address, token, buyer.address, USDT(1));
    assert.equal(badPayee, false);
    // a blocked attempt is recorded, not reverted
    await (await t.budget.connect(operator).pay(agentId, token, buyer.address, USDT(1), "0x" + "22".repeat(32))).wait();
    const rec = await t.registry.recordOf(agentId);
    assert.equal(rec.payments, 1n);
    assert.equal(rec.blocked, 1n);
    // the operator records work
    await (await t.registry.connect(operator).recordWork(agentId, "0x" + "33".repeat(32))).wait();
    assert.equal((await t.registry.recordOf(agentId)).work, 1n);
  });

  it("resale: royalty to the builder, permission ends for the old owner", async () => {
    await (await t.cpuAs(owner).setApprovalForAll(await t.market.getAddress(), true)).wait();
    const expires = BigInt((await t.p.getBlock("latest"))!.timestamp + 86400);
    await (await t.market.connect(owner).list(agentId, X.usdt0, USDT(200), expires)).wait();
    // while escrowed, the owner's permission is not valid
    assert.equal(await t.registry.permissionValid(agentId, operator.address), false);
    const [, outputs] = await t.market.check(1);
    assert.equal(Number(outputs), 3); // allow + royalty_on

    await (await t.erc20(X.usdt0, buyer).approve(await t.market.getAddress(), USDT(200))).wait();
    const o0 = await t.erc20(X.usdt0, buyer).balanceOf(owner.address);
    const b0 = await t.erc20(X.usdt0, buyer).balanceOf(builder.address);
    await (await t.market.connect(buyer).buy(1)).wait();
    assert.equal((await t.erc20(X.usdt0, buyer).balanceOf(owner.address)) - o0, USDT(180));
    assert.equal((await t.erc20(X.usdt0, buyer).balanceOf(builder.address)) - b0, USDT(10));
    assert.equal(await t.registry.permissionValid(agentId, operator.address), false);
    // the old owner can no longer withdraw the budget; the new owner can
    await assert.rejects(t.budget.connect(owner).withdraw(agentId, X.usdt0, USDT(1), owner.address));
    await (await t.budget.connect(buyer).withdraw(agentId, X.usdt0, USDT(8), buyer.address)).wait();
    // the track record moved with the agent
    const rec = await t.registry.recordOf(agentId);
    assert.equal(rec.sales, 2n);
    assert.equal(rec.work, 1n);
  });

  it("BEM sale: half of Evermo's fee goes to the burn address", async () => {
    await (await t.cpuAs(buyer).setApprovalForAll(await t.market.getAddress(), true)).wait();
    const expires = BigInt((await t.p.getBlock("latest"))!.timestamp + 86400);
    await (await t.market.connect(buyer).list(agentId, X.bem, BEM(20), expires)).wait();
    const bem = t.erc20(X.bem, buyer2);
    await (await bem.approve(await t.market.getAddress(), BEM(20))).wait();
    const d0 = await bem.balanceOf("0x000000000000000000000000000000000000dEaD");
    await (await t.market.connect(buyer2).buy(2)).wait();
    assert.equal((await bem.balanceOf("0x000000000000000000000000000000000000dEaD")) - d0, BEM(0.5));
    assert.equal(await t.cpuAs(buyer2).ownerOf(agentTokenId), buyer2.address);
  });

  it("expired or cancelled listings cannot be bought", async () => {
    await (await t.cpuAs(buyer2).setApprovalForAll(await t.market.getAddress(), true)).wait();
    const now = (await t.p.getBlock("latest"))!.timestamp;
    await (await t.market.connect(buyer2).list(agentId, X.usdt0, USDT(10), BigInt(now + 60))).wait();
    await t.p.send("evm_increaseTime", [120]);
    await t.p.send("evm_mine", []);
    await (await t.erc20(X.usdt0, buyer).approve(await t.market.getAddress(), USDT(10))).wait();
    await assert.rejects(t.market.connect(buyer).buy(3));
    await (await t.market.connect(buyer2).cancel(3)).wait();
    assert.equal(await t.cpuAs(buyer2).ownerOf(agentTokenId), buyer2.address);
  });
});
