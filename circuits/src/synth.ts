// Builds NAND-only netlists from boolean expressions.
import type { Netlist } from "./netlist.ts";

export type Expr =
  | { kind: "in"; index: number }
  | { kind: "not"; a: Expr }
  | { kind: "and"; a: Expr; b: Expr }
  | { kind: "or"; a: Expr; b: Expr };

export const input = (index: number): Expr => ({ kind: "in", index });
export const not = (a: Expr): Expr => ({ kind: "not", a });
export const and = (...xs: Expr[]): Expr => xs.reduce((a, b) => ({ kind: "and", a, b }));
export const or = (...xs: Expr[]): Expr => xs.reduce((a, b) => ({ kind: "or", a, b }));

export function synthesize(nIn: number, outputs: Expr[]): Netlist {
  const gates: Array<[number, number]> = [];
  const memo = new Map<string, number>();
  const nand = (a: number, b: number): number => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    gates.push([a, b]);
    const sig = 2 + nIn + gates.length - 1;
    memo.set(key, sig);
    return sig;
  };
  const build = (e: Expr): number => {
    switch (e.kind) {
      case "in":
        if (e.index < 0 || e.index >= nIn) throw new Error(`input ${e.index} out of range`);
        return 2 + e.index;
      case "not": {
        const a = build(e.a);
        return nand(a, a);
      }
      case "and": {
        const n = nand(build(e.a), build(e.b));
        return nand(n, n);
      }
      case "or": {
        const a = build(e.a), b = build(e.b);
        return nand(nand(a, a), nand(b, b));
      }
    }
  };
  const roots = outputs.map(build);
  // TAP-02 takes the last nOut signals as outputs, in order. Append two fresh inverters per output
  // so the outputs are the final signals regardless of where their logic was built.
  const inverted = roots.map((r) => { gates.push([r, r]); return 2 + nIn + gates.length - 1; });
  inverted.forEach((r) => gates.push([r, r]));
  return { nIn, nOut: outputs.length, gates };
}
