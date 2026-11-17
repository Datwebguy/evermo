// Read-only checks against X Layer mainnet. No wallet, no funds.
import { JsonRpcProvider, Contract, formatEther } from "ethers";
import { RPC, ADDR, ABI, IMPL_SLOT } from "./addresses.mjs";

const p = new JsonRpcProvider(RPC, 196, { staticNetwork: true, batchMaxCount: 10 });
const impl = async (a) => "0x" + (await p.getStorage(a, IMPL_SLOT)).slice(26);

console.log("== Deployments");
for (const [name, a] of Object.entries(ADDR)) {
  const code = await p.getCode(a);
  console.log(`${name.padEnd(16)} ${a} code=${(code.length - 2) / 2} bytes`);
}
const factory = new Contract(ADDR.factory, ABI.factory, p);
const beacon = new Contract(ADDR.circuitBeacon, ABI.beacon, p);
const hub = new Contract(ADDR.dewebHub, ABI.hub, p);
console.log("factory  cpuCount", (await factory.cpuCount()).toString(), "isSealed", await factory.isSealed(),
  "owner", await factory.owner(), "impl", await impl(ADDR.factory));
console.log("beacon   owner", await beacon.owner(), "(zero = circuit code can no longer be upgraded)",
  "implementation", await beacon.implementation());
console.log("sites    impl", await impl(ADDR.siteRegistry));
console.log("hub      isSealed", await hub.isSealed(), "owner", await hub.owner());

const opener = new Contract(ADDR.containerOpener, ABI.opener, p);
console.log("opener   FEE", formatEther(await opener.FEE()), "OKB");

console.log("\n== eval on live circuits");
for (const i of [0, 42]) {
  const cpuAddr = await factory.cpuAt(i);
  const cpu = new Contract(cpuAddr, ABI.cpu, p);
  const info = await cpu.circuitInfo(1);
  const input = "0x" + "00".repeat(Math.max(1, Math.ceil(Number(info.nIn) / 8)));
  const out = await cpu.eval(1, input);
  const gas = await p.estimateGas({ to: cpuAddr, data: cpu.interface.encodeFunctionData("eval", [1, input]) });
  console.log(`processor #${i} "${await cpu.name()}" circuit 1: nIn=${info.nIn} gates=${info.gates} eval=${out} gas=${gas}`,
    "tapeout fee", formatEther(await cpu.TAPEOUT_FEE()), "OKB");
}

console.log("\n== Processors that still mint transistors (sample of 40)");
const n = Number(await factory.cpuCount());
let open = 0, seen = 0;
for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 40))) {
  try {
    const cpu = new Contract(await factory.cpuAt(i), ABI.cpu, p);
    const tr = new Contract(await cpu.transistors(), ABI.transistors, p);
    const [price, minted, cap] = await Promise.all([tr.mintPrice(), tr.minted(), tr.supplyCap()]);
    seen++; if (cap > minted) open++;
    if (i === 222) console.log(`#222 price ${formatEther(price)} OKB, ${cap - minted} left`);
  } catch {}
}
console.log(`${open} of ${seen} sampled processors can still mint`);
