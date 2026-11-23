// Evermo's two rule circuits. The `reference` functions are the plain-language rules the netlists must match.
import { and, input, not, synthesize, type Expr } from "./synth.ts";
import type { Netlist } from "./netlist.ts";

export interface CircuitSpec {
  name: string;
  inputs: string[];
  outputs: string[];
  logic: Expr[];
  reference: (bits: number[]) => number[];
}

export const budget: CircuitSpec = {
  name: "budget",
  inputs: ["permission_valid", "payee_allowed", "over_payment_limit", "over_daily_limit"],
  outputs: ["allow"],
  logic: [and(input(0), input(1), not(input(2)), not(input(3)))],
  reference: ([permission, payee, overPayment, overDaily]) => [
    permission && payee && !overPayment && !overDaily ? 1 : 0,
  ],
};

export const resale: CircuitSpec = {
  name: "resale",
  inputs: ["listing_active", "escrow_holds_agent", "price_paid", "first_sale"],
  outputs: ["allow", "royalty_on"],
  logic: [
    and(input(0), input(1), input(2)),
    and(input(0), input(1), input(2), not(input(3))),
  ],
  reference: ([active, escrow, paid, first]) => {
    const allow = active && escrow && paid ? 1 : 0;
    return [allow, allow && !first ? 1 : 0];
  },
};

export const specs = [budget, resale];

export function netlistOf(spec: CircuitSpec): Netlist {
  return synthesize(spec.inputs.length, spec.logic);
}
