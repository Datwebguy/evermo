/** Deployment addresses. Fill these in after running scripts/deploy.ts. */
export const CHAIN_ID = 196;
export const RPC_URL = "https://rpc.xlayer.tech";

export interface VaultConfig {
  label: string;
  vault: string;
}

export const CREDIT_ADDRESS = import.meta.env.VITE_CREDIT_ADDRESS ?? "";

export const VAULTS: VaultConfig[] = JSON.parse(import.meta.env.VITE_VAULTS ?? "[]");
