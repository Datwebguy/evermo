// TAP-02 netlist encoding and a reference evaluator for combinational circuits.
// Signals: 0 = constant 0, 1 = constant 1, 2..2+nIn-1 = inputs, then one signal per NAND in record order.
// Outputs are the last nOut signals. Bits are packed least significant bit first.

export interface Netlist {
  nIn: number;
  nOut: number;
  /** Each gate is a NAND of two earlier signals. */
  gates: Array<[number, number]>;
}

const u24 = (n: number): string => n.toString(16).padStart(6, "0");

export function encode(net: Netlist): string {
  return "0x" + net.gates.map(([a, b]) => "00" + u24(a) + u24(b)).join("");
}

export function decode(hex: string, nIn: number, nOut: number): Netlist {
  const s = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (s.length % 14 !== 0) throw new Error("only NAND records are supported");
  const gates: Array<[number, number]> = [];
  for (let i = 0; i < s.length; i += 14) {
    if (s.slice(i, i + 2) !== "00") throw new Error("only NAND records are supported");
    gates.push([parseInt(s.slice(i + 2, i + 8), 16), parseInt(s.slice(i + 8, i + 14), 16)]);
  }
  return { nIn, nOut, gates };
}

/** Checks TAP-02 well-formedness for a NAND-only netlist. */
export function assertWellFormed(net: Netlist): void {
  if (net.nOut < 1) throw new Error("no outputs");
  net.gates.forEach(([a, b], i) => {
    const self = 2 + net.nIn + i;
    if (a >= self || b >= self) throw new Error(`NAND ${i}: future signal`);
  });
  if (net.gates.length < net.nOut) throw new Error("too few signals for outputs");
}

export function evaluate(net: Netlist, inputs: number[]): number[] {
  const s: number[] = [0, 1, ...inputs.map((x) => x & 1)];
  for (const [a, b] of net.gates) s.push(1 - (s[a] & s[b]));
  return s.slice(s.length - net.nOut);
}

export function packBits(bits: number[]): string {
  const bytes = new Array(Math.max(1, Math.ceil(bits.length / 8))).fill(0);
  bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 1 << (i & 7); });
  return "0x" + bytes.map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function unpackBits(hex: string, n: number): number[] {
  const s = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Array.from({ length: n }, (_, i) => {
    const byte = parseInt(s.slice((i >> 3) * 2, (i >> 3) * 2 + 2) || "00", 16);
    return (byte >> (i & 7)) & 1;
  });
}
