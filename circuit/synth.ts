import { NUM_INPUTS, NUM_OUTPUTS, reference, toBits } from "./rules.ts";

/** NAND-only netlist. Wires 0..numInputs-1 are inputs; gate i drives wire numInputs+i. */
export interface Netlist {
  numInputs: number;
  gates: [number, number][];
  outputs: number[];
}

export function evaluate(net: Netlist, inputs: number[]): number[] {
  const w = [...inputs];
  for (const [a, b] of net.gates) w.push(1 ^ (w[a] & w[b]));
  return net.outputs.map((o) => w[o]);
}

/** Two-level sum-of-products synthesis with shared sub-terms, expressed purely in NAND gates. */
export function synthesize(): Netlist {
  const gates: [number, number][] = [];
  const nandCache = new Map<string, number>();

  const nand = (a: number, b: number): number => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const hit = nandCache.get(key);
    if (hit !== undefined) return hit;
    gates.push([a, b]);
    const wire = NUM_INPUTS + gates.length - 1;
    nandCache.set(key, wire);
    return wire;
  };
  const not = (a: number) => nand(a, a);
  const and = (a: number, b: number) => not(nand(a, b));
  const or = (a: number, b: number) => nand(not(a), not(b));

  const lit = (i: number, value: number) => (value ? i : not(i));
  const minterm = (row: number) =>
    toBits(row).map((v, i) => lit(i, v)).reduce((acc, w) => and(acc, w));

  const outputs: number[] = [];
  for (let o = 0; o < NUM_OUTPUTS; o++) {
    const rows = Array.from({ length: 1 << NUM_INPUTS }, (_, r) => r).filter((r) => reference(toBits(r))[o] === 1);
    if (rows.length === 0) {
      const one = nand(0, not(0)); // x NAND !x = 1
      outputs.push(not(one));
    } else {
      outputs.push(rows.map(minterm).reduce((acc, w) => or(acc, w)));
    }
  }
  return { numInputs: NUM_INPUTS, gates, outputs };
}
