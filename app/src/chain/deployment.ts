// The deployment file is written by the deployment script; nothing here is typed in by hand.
export type Token = { symbol: string; address: string; decimals: number };
export type Deployment = {
  network: string; chainId: number; rpc: string; explorer: string; service: string;
  registry: string; budget: string; market: string; processor: string; budgetCircuitId: string; resaleCircuitId: string;
  operator: string; feeRecipient: string; hub: string; opener: string; factory: string; tokens: Token[]; tapesendApp: string;
};

let loaded: Deployment | null = null;
export async function loadDeployment(): Promise<Deployment> {
  if (loaded) return loaded;
  const r = await fetch("./deployment.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Evermo is not available right now.");
  loaded = await r.json();
  return loaded!;
}
export const dep = () => { if (!loaded) throw new Error("not loaded"); return loaded; };
export const tokenBy = (addr: string) => dep().tokens.find((t) => t.address.toLowerCase() === addr.toLowerCase());
