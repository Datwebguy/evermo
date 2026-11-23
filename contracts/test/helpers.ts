// Shared setup for tests on a local copy of X Layer mainnet: real TapeOut contracts, real USDT0 and BEM.
import { readFileSync } from "node:fs";
import { network } from "hardhat";

export const X = {
  factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761",
  opener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
  usdt0: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  bem: "0x60e62efa9405d6873c5deabd4e6cc91c25363952",
  usdt0Pool: "0x0cbe0dbe1400e57f371a38bd3b9bc80f7c3676da",
  bemPool: "0x2ccf8aa17f5df9fb5d51c9de12135a913ff29f7a",
};

const CPU_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function transistors() view returns (address)",
  "function TAPEOUT_FEE() view returns (uint256)",
  "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)",
  "function eval(uint256 id, bytes inputs) view returns (bytes)",
  "function ownerOf(uint256) view returns (address)",
  "function setApprovalForAll(address,bool)",
  "function transferFrom(address,address,uint256)",
];

export const circuitFile = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../circuits/build/${name}.json`, import.meta.url), "utf8"));

export async function setup() {
  const { ethers } = await network.create("xfork");
  const p = ethers.provider;
  const signers = await ethers.getSigners();
  for (const s of signers.slice(0, 6)) await p.send("hardhat_setBalance", [s.address, "0x56BC75E2D63100000"]);
  const factory = new ethers.Contract(X.factory, ["function cpuAt(uint256) view returns (address)"], signers[0]);
  const cpuAddr: string = await factory.cpuAt(222);

  /** Mints the NAND transistors needed and tapes out a netlist; returns the new circuit id. */
  async function tapeout(signer: any, netlist: string, nIn: number, nOut: number): Promise<bigint> {
    const cpu = new ethers.Contract(cpuAddr, CPU_ABI, signer);
    const tr = new ethers.Contract(await cpu.transistors(), ["function mint(uint256,uint256) payable", "function mintPrice() view returns (uint256)"], signer);
    const gates = (netlist.length - 2) / 14;
    let lo = (await tr.mintPrice()) * BigInt(gates), hi = lo + 10n ** 16n;
    while (hi - lo > 10n ** 9n) { const mid = (lo + hi) / 2n; try { await tr.mint.staticCall(0, gates, { value: mid }); hi = mid; } catch { lo = mid; } }
    await (await tr.mint(0, gates, { value: hi })).wait();
    const rc = await (await cpu.tapeout(netlist, nIn, nOut, { value: await cpu.TAPEOUT_FEE() })).wait();
    const ev = rc!.logs.map((l: any) => { try { return cpu.interface.parseLog(l); } catch { return null; } }).find((x: any) => x?.name === "Transfer");
    return ev!.args.tokenId as bigint;
  }

  /** Gives `to` real tokens by moving them from a large on-chain holder on the local copy. */
  async function fund(token: string, holder: string, to: string, amount: bigint) {
    await p.send("hardhat_impersonateAccount", [holder]);
    await p.send("hardhat_setBalance", [holder, "0x56BC75E2D63100000"]);
    const h = await ethers.getSigner(holder);
    await (await new ethers.Contract(token, ["function transfer(address,uint256) returns (bool)"], h).transfer(to, amount)).wait();
    await p.send("hardhat_stopImpersonatingAccount", [holder]);
  }

  const budgetC = circuitFile("budget"), resaleC = circuitFile("resale");
  const deployer = signers[0];
  const budgetId = await tapeout(deployer, budgetC.netlist, budgetC.nIn, budgetC.nOut);
  const resaleId = await tapeout(deployer, resaleC.netlist, resaleC.nIn, resaleC.nOut);

  const registry = await ethers.deployContract("AgentRegistry", [X.factory]);
  const budget = await ethers.deployContract("AgentBudget", [await registry.getAddress(), cpuAddr, budgetId]);
  const feeRecipient = signers[5];
  const market = await ethers.deployContract("EvermoMarket", [await registry.getAddress(), cpuAddr, resaleId, feeRecipient.address, X.bem, [X.usdt0, X.bem]]);
  await (await registry.bind(await budget.getAddress(), await market.getAddress())).wait();

  const cpuAs = (s: any) => new ethers.Contract(cpuAddr, CPU_ABI, s);
  const erc20 = (addr: string, s: any) => new ethers.Contract(addr, ["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)"], s);
  return { ethers, p, signers, cpuAddr, cpuAs, tapeout, fund, erc20, budgetId, resaleId, registry, budget, market, feeRecipient, budgetC, resaleC };
}
