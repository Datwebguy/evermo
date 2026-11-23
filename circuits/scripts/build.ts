// Writes the taped-out-ready netlists to circuits/build/<name>.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { specs, netlistOf } from "../src/rules.ts";
import { encode } from "../src/netlist.ts";

const dir = new URL("../build/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const spec of specs) {
  const net = netlistOf(spec);
  const out = { name: spec.name, inputs: spec.inputs, outputs: spec.outputs, nIn: net.nIn, nOut: net.nOut, gates: net.gates.length, netlist: encode(net) };
  writeFileSync(new URL(`${spec.name}.json`, dir), JSON.stringify(out, null, 2) + "\n");
  console.log(`${spec.name}: ${net.nIn} inputs, ${net.nOut} outputs, ${net.gates.length} NAND gates`);
}
