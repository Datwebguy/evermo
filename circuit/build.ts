import { mkdirSync, writeFileSync } from "node:fs";
import { INPUT_NAMES, OUTPUT_NAMES } from "./rules.ts";
import { synthesize } from "./synth.ts";

const net = synthesize();
const out = {
  name: "evermo-rules",
  primitives: ["NAND"],
  inputNames: INPUT_NAMES,
  outputNames: OUTPUT_NAMES,
  ...net,
};

mkdirSync(new URL("./netlist/", import.meta.url), { recursive: true });
writeFileSync(new URL("./netlist/evermo-rules.netlist.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`evermo-rules: ${net.numInputs} inputs, ${net.gates.length} NAND gates, ${net.outputs.length} outputs`);
