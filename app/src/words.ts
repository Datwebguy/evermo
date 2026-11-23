// How chain events read on screen.
import type { Item } from "./service/api";
import { money, dateOf } from "./chain/format";

export type Line = { text: string; tone: "ok" | "no" | "brand" | "muted"; kind: string };
export function describe(it: Item): Line | null {
  const d = it.data;
  switch (it.name) {
    case "AgentRegistered": return { text: "Added to Evermo", tone: "brand", kind: "add" };
    case "Recorded": return d.kind === "work" ? { text: "Finished a job", tone: "ok", kind: "work" } : null; // payments and sales have their own lines
    case "PaymentDecided": return d.allowed
      ? { text: `Rules allowed a payment of ${money(d.amount, d.token)}`, tone: "ok", kind: "pay" }
      : { text: `Rules refused a payment of ${money(d.amount, d.token)}`, tone: "no", kind: "refuse" };
    case "PermissionSet": return /^0x0+$/.test(String(d.operator)) || Number(d.expiresAt) * 1000 <= Date.now()
      ? { text: "Permission ended by the owner", tone: "no", kind: "stop" }
      : { text: `Owner let Evermo act for it until ${dateOf(Number(d.expiresAt))}`, tone: "muted", kind: "perm" };
    case "Deposited": return { text: `Budget topped up by ${money(d.amount, d.token)}`, tone: "muted", kind: "deposit" };
    case "Withdrawn": return { text: `${money(d.amount, d.token)} taken out of the budget`, tone: "muted", kind: "withdraw" };
    case "Listed": return { text: `Put up for sale at ${money(d.price, d.token)}`, tone: "brand", kind: "list" };
    case "Cancelled": return { text: "Taken off sale", tone: "muted", kind: "cancel" };
    case "Sold": return { text: `Sold for ${money(d.price, d.token)}`, tone: "brand", kind: "sale" };
    default: return null;
  }
}

/** Inputs of the two circuits, in plain words (see docs/CIRCUIT.md). */
export const circuits = {
  budget: { inputs: ["Owner's permission is current", "Payee is on the allowed list", "Above the per-payment limit", "Above today's limit"], outputs: ["Payment allowed"] },
  resale: { inputs: ["Listing is open", "Evermo holds the agent", "Price paid in full", "First sale"], outputs: ["Sale allowed", "Builder royalty paid"] },
};
