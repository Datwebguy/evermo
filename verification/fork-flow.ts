// End-to-end TapeOut flow for Evermo on a mainnet fork of X Layer:
// mint a NAND, tape out, eval, open a container, upload a site file, give an uploader access,
// send a TapeSend message to an agent's container, then transfer the agent and check who controls it.
import { network } from "hardhat";
import { ADDR, ABI, NOT_GATE } from "./addresses.mjs";

const { ethers } = await network.create("xfork");
const p = ethers.provider;
const [evermo, owner, buyer, uploader] = await ethers.getSigners();
for (const s of [evermo, owner]) await p.send("hardhat_setBalance", [s.address, "0x56BC75E2D63100000"]); // 100 OKB on the fork
const ok = (label: string, cond: boolean, extra = "") => console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);

const factory = new ethers.Contract(ADDR.factory, ABI.factory, evermo);
const cpuAddr = await factory.cpuAt(222);

async function circuitFor(signer: any) {
  const cpu = new ethers.Contract(cpuAddr, ABI.cpu, signer);
  const tr = new ethers.Contract(await cpu.transistors(), ABI.transistors, signer);
  // Find the exact mint cost (price + protocol fee) by simulation.
  let lo = await tr.mintPrice(), hi = lo + 10n ** 15n + 10n ** 12n;
  while (hi - lo > 10n ** 9n) { const mid = (lo + hi) / 2n; try { await tr.mint.staticCall(0, 1, { value: mid }); hi = mid; } catch { lo = mid; } }
  await (await tr.mint(0, 1, { value: hi })).wait();
  const fee = await cpu.TAPEOUT_FEE();
  const rc = await (await cpu.tapeout(NOT_GATE, 1, 1, { value: fee })).wait();
  // nextId() returns the latest existing id, so read the new id from the Transfer event.
  const id = rc!.logs.map((l: any) => { try { return cpu.interface.parseLog(l); } catch { return null; } })
    .find((x: any) => x?.name === "Transfer")!.args.tokenId;
  const opener = new ethers.Contract(ADDR.containerOpener, ABI.opener, signer);
  const openFee = await opener.FEE();
  await (await opener.open(cpuAddr, id, { value: openFee })).wait();
  return { cpu, id, container: await opener.accountOf(cpuAddr, id), mintCost: hi, tapeoutFee: fee, openFee };
}

const svc = await circuitFor(evermo);
ok("mint 1 NAND", true, `${ethers.formatEther(svc.mintCost)} OKB`);
ok("tape out a circuit", (await svc.cpu.ownerOf(svc.id)) === evermo.address, `id ${svc.id}, fee ${ethers.formatEther(svc.tapeoutFee)} OKB`);
ok("eval(0x01) = 0x00", (await svc.cpu.eval(svc.id, "0x01")) === "0x00");
ok("eval(0x00) = 0x01", (await svc.cpu.eval(svc.id, "0x00")) === "0x01");
const g = await p.estimateGas({ to: cpuAddr, data: svc.cpu.interface.encodeFunctionData("eval", [svc.id, "0x01"]) });
ok("eval gas from a transaction", g < 100000n, `${g} gas`);
ok("open container", true, `${svc.container}, fee ${ethers.formatEther(svc.openFee)} OKB`);

const agent = await circuitFor(owner);
const sites = new ethers.Contract(ADDR.siteRegistry, ABI.sites, owner);
const html = ethers.toUtf8Bytes("<!doctype html><title>Evermo agent</title><h1>Position Watch</h1>");
await (await sites.putFile(agent.container, "index.html", "text/html", ethers.sha256(html), html)).wait();
const fi = await sites.fileInfo(agent.container, "index.html");
ok("upload index.html to SiteRegistry", fi.sha256Hash === ethers.sha256(html), `${fi.size} bytes`);
await (await sites.setOperator(agent.container, uploader.address, 3600)).wait();
ok("uploader (operator) can edit", await sites.canEdit(agent.container, uploader.address));

const hub = (s: any) => new ethers.Contract(ADDR.dewebHub, ABI.hub, s);
await (await hub(owner).publishKey(cpuAddr, agent.id, 1, 0, ethers.keccak256("0x01"), 1n << 2n)).wait();
const endpoint = ethers.solidityPacked(["uint32", "uint64", "address"], [0, 196, agent.container]);
const before = await hub(evermo).inboxCount(endpoint);
await (await hub(evermo).send(cpuAddr, svc.id, endpoint, ethers.ZeroHash, ethers.toUtf8Bytes("encrypted alert"))).wait();
ok("TapeSend: Evermo sends to the agent's inbox", (await hub(evermo).inboxCount(endpoint)) === before + 1n);
let refused = false;
try { await hub(owner).send.staticCall(cpuAddr, svc.id, endpoint, ethers.ZeroHash, "0x01"); } catch { refused = true; }
ok("TapeSend: nobody else can send as Evermo", refused);

await (await agent.cpu.transferFrom(owner.address, buyer.address, agent.id)).wait();
ok("after sale: new owner controls the site", await sites.isOwner(agent.container, buyer.address));
ok("after sale: old owner loses control", !(await sites.isOwner(agent.container, owner.address)));
ok("after sale: old uploader loses access", !(await sites.canEdit(agent.container, uploader.address)));
