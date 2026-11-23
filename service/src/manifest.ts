// TAP-11 manifest with the holder's EIP-712 delegation of the signing key.
import { verifyTypedData, type Signer } from "ethers";
import type { Price } from "./pricing.ts";
import { toolsSha256, type Tool } from "./tools.ts";

export const delegationTypes = { Delegation: [
  { name: "container", type: "address" }, { name: "signer", type: "address" }, { name: "expires", type: "uint64" }] };
export const delegationDomain = (chainId: number, hub: string) => ({ name: "TapeAPI", version: "1", chainId, verifyingContract: hub });
export const MAX_DELEGATION = 366 * 86400;

export async function signDelegation(holder: Signer, chainId: number, hub: string, container: string, signer: string, expires: number) {
  return holder.signTypedData(delegationDomain(chainId, hub), delegationTypes, { container, signer, expires });
}
export function delegationSigner(chainId: number, hub: string, container: string, signer: string, expires: number, sig: string): string {
  return verifyTypedData(delegationDomain(chainId, hub), delegationTypes, { container, signer, expires }, sig);
}

export type Method = { name: string; priceBEM: string; params: Record<string, string>; returns: string; description: string };
export type AgentDef = { name: string; description: string; methods: Method[]; tools: Tool[] };

export function buildManifest(o: {
  agent: AgentDef; circuits: string; tokenId: bigint; container: string; signer: string;
  delegation: { expires: number; sig: string }; liveUrl: string; model: string; price: Price;
}) {
  return {
    tapeapi: "0.1",
    name: o.agent.name,
    circuits: o.circuits,
    tokenId: o.tokenId.toString(),
    container: o.container,
    signer: o.signer,
    delegation: o.delegation,
    endpoints: { live: [o.liveUrl] },
    methods: [...o.agent.methods,
      { name: "receipt", priceBEM: "0", params: { id: "string" }, returns: "receipt", description: "Signed usage receipt for an earlier request" }],
    mcp: { endpoint: o.liveUrl + "/mcp", toolsSha256: toolsSha256(o.agent.tools) },
    ai: {
      endpoints: [{ format: "openai-chat", baseUrl: o.liveUrl + "/v1" }],
      models: [{ id: o.model, prices: [o.price] }],
    },
  };
}
