import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "chai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ethers: any;
before(async () => {
  const { network } = await import("hardhat");
  ({ ethers } = await network.create());
});

const WEEK = 7 * 24 * 3600;
const usdc = (n: number) => BigInt(Math.round(n * 1e6));
const e18 = (n: number) => ethers.parseUnits(n.toString(), 18) as bigint;

const netlist = JSON.parse(readFileSync(resolve(process.cwd(), "circuit/netlist/evermo-rules.netlist.json"), "utf8"));

async function advance(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function deploy() {
  const [owner, alice, bob, treasury] = await ethers.getSigners();

  const token = await ethers.deployContract("MockERC20", ["USD Coin", "USDC", 6]);
  const source = await ethers.deployContract("MockYieldSource", [token]);
  const processor = await ethers.deployContract("MockProcessor");
  await processor.setNetlist(1, netlist.numInputs, netlist.gates, netlist.outputs);

  const credit = await ethers.deployContract("EvermoCredit", [owner.address]);
  const vault = await ethers.deployContract("EvermoVault", [
    {
      asset: await token.getAddress(),
      yieldSource: await source.getAddress(),
      credit: await credit.getAddress(),
      processor: await processor.getAddress(),
      circuitId: 1,
      bucketSeconds: WEEK,
      sizeTiers: [e18(100), e18(1000), e18(10000)],
      treasury: treasury.address,
      performanceFeeBps: 1000,
      claimFeeBps: 500,
    },
    owner.address,
  ]);
  await source.bindVault(await vault.getAddress());
  await credit.setMinter(await vault.getAddress(), true);
  const receipt = await ethers.getContractAt("ReceiptToken", await vault.receipt());

  for (const u of [alice, bob]) {
    await token.mint(u.address, usdc(10_000));
    await token.connect(u).approve(await vault.getAddress(), ethers.MaxUint256);
  }
  return { owner, alice, bob, treasury, token, source, processor, credit, vault, receipt };
}

describe("EvermoVault", () => {
  it("mints a 1:1 receipt on deposit and places funds in the yield source", async () => {
    const { alice, vault, receipt, source } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    expect(await receipt.balanceOf(alice.address)).to.equal(usdc(1000));
    expect(await source.totalAssets()).to.equal(usdc(1000));
    expect(await receipt.symbol()).to.equal("evUSDC");
    expect(await receipt.decimals()).to.equal(6);
  });

  it("attributes yield net of the performance fee", async () => {
    const { alice, vault, source, token, treasury } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    expect(await vault.pendingYield(alice.address)).to.equal(usdc(90));
    await vault.harvest();
    expect(await vault.pendingYield(alice.address)).to.equal(usdc(90));
    expect(await token.balanceOf(treasury.address)).to.equal(usdc(10));
  });

  it("rejects a claim before the circuit's minimum holding time", async () => {
    const { alice, vault, source } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    await expect(vault.connect(alice).claim()).to.be.revertedWithCustomError(vault, "ClaimNotAllowed");
  });

  it("mints credits at the circuit's rate and routes fees to the treasury", async () => {
    const { alice, vault, source, credit, token, treasury } = await deploy();
    await vault.connect(alice).deposit(usdc(1000)); // size category 2
    await source.accrue(usdc(100));
    await advance(2 * WEEK + 60); // duration bucket 2 -> tier min(15, 6 + 2 + 4) = 12 -> 80%

    const preview = await vault.previewClaim(alice.address);
    expect(preview.allowed).to.equal(true);
    expect(preview.rateBps).to.equal(8000n);

    await vault.connect(alice).claim();
    // 90 USDC yield * 80% = 72 credits; 5% claim fee = 3.6
    expect(await credit.balanceOf(alice.address)).to.equal(e18(68.4));
    expect(await credit.balanceOf(treasury.address)).to.equal(e18(3.6));
    expect(await token.balanceOf(treasury.address)).to.equal(usdc(100)); // 10 fee + 90 backing
    expect(await vault.accrued(alice.address)).to.equal(0n);
    await expect(vault.connect(alice).claim()).to.be.revertedWithCustomError(vault, "NothingToClaim");
  });

  it("denies claims for blocked (ineligible) accounts", async () => {
    const { alice, vault, source } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    await advance(2 * WEEK);
    await vault.setBlocked(alice.address, true);
    await expect(vault.connect(alice).claim()).to.be.revertedWithCustomError(vault, "ClaimNotAllowed");
  });

  it("follows the receipt token: yield after a transfer goes to the new holder", async () => {
    const { alice, bob, vault, source, receipt } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100)); // 90 net, all alice's
    await receipt.connect(alice).transfer(bob.address, usdc(1000));
    expect(await vault.pendingYield(alice.address)).to.equal(usdc(90));
    expect(await vault.pendingYield(bob.address)).to.equal(0n);

    await source.accrue(usdc(100)); // 90 net, now bob's
    expect(await vault.pendingYield(alice.address)).to.equal(usdc(90));
    expect(await vault.pendingYield(bob.address)).to.equal(usdc(90));
  });

  it("does not let a late depositor capture earlier yield", async () => {
    const { alice, bob, vault, source } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    await vault.connect(bob).deposit(usdc(1000));
    expect(await vault.pendingYield(bob.address)).to.equal(0n);
    expect(await vault.pendingYield(alice.address)).to.equal(usdc(90));
  });

  it("withdraws principal plus accrued yield", async () => {
    const { alice, vault, source, token, receipt } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    const before = await token.balanceOf(alice.address);
    await vault.connect(alice).withdraw(usdc(1000));
    expect((await token.balanceOf(alice.address)) - before).to.equal(usdc(1090));
    expect(await receipt.totalSupply()).to.equal(0n);
    expect(await vault.yieldLiability()).to.equal(0n);
  });

  it("only the vault can mint receipts, only owner can configure", async () => {
    const { alice, vault, receipt } = await deploy();
    await expect(receipt.connect(alice).mint(alice.address, 1n)).to.be.revertedWithCustomError(receipt, "NotVault");
    await expect(vault.connect(alice).setFees(1, 1)).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    await expect(vault.setFees(2001, 0)).to.be.revertedWithCustomError(vault, "FeeTooHigh");
  });
});

describe("EvermoCredit", () => {
  it("burns credits and notifies the fee sink", async () => {
    const { owner, alice, vault, source, credit } = await deploy();
    await vault.connect(alice).deposit(usdc(1000));
    await source.accrue(usdc(100));
    await advance(2 * WEEK);
    await vault.connect(alice).claim();

    const action = ethers.id("PROCESSOR_CREATE");
    await expect(credit.connect(alice).burnForFee(e18(1), action, "0x")).to.be.revertedWithCustomError(
      credit,
      "FeeSinkNotSet",
    );

    const sink = await ethers.deployContract("MockFeeSink");
    await credit.connect(owner).setFeeSink(await sink.getAddress());
    const supplyBefore = await credit.totalSupply();
    await credit.connect(alice).burnForFee(e18(1), action, "0x");
    expect(await credit.totalSupply()).to.equal(supplyBefore - e18(1));
    expect(await sink.lastAmount()).to.equal(e18(1));
    expect(await sink.lastAction()).to.equal(action);
  });

  it("only minters can mint", async () => {
    const { alice, credit } = await deploy();
    await expect(credit.connect(alice).mint(alice.address, 1n)).to.be.revertedWithCustomError(credit, "NotMinter");
  });
});
