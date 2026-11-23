// Position Watch: lending health on Aave V3 (X Layer), read live from the pool contract.
import { Contract, getAddress, isAddress } from "ethers";
import { provider } from "../chain.ts";
import { chain } from "../config.ts";
import type { AgentDef } from "../manifest.ts";

const pool = new Contract(chain.aavePool, ["function getUserAccountData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256)"], provider);
const MAX = (1n << 256n) - 1n;

export const def: AgentDef = {
  name: "Position Watch",
  description: "Watches a lending position on Aave on X Layer and warns before it can be liquidated.",
  methods: [{ name: "health", priceBEM: "0", params: { account: "address", warnBelow: "string?" }, returns: "health",
    description: "Current collateral, debt and health factor of an account, and whether it is below the warning level" }],
  tools: [{ name: "health", title: "Lending health",
    description: "Read the collateral, debt and health factor of an Aave account on X Layer.",
    inputSchema: { type: "object", properties: { account: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" }, warnBelow: { type: "string", pattern: "^[0-9]+(\\.[0-9]{1,4})?$" } }, required: ["account"], additionalProperties: false } }],
};

const dec = (v: bigint, d: number, keep: number) => {
  const s = v.toString().padStart(d + 1, "0"); return s.slice(0, -d) + "." + s.slice(-d, -d + keep || undefined);
};

export async function health(params: any) {
  if (!isAddress(params?.account)) throw new BadInput("account must be an address");
  const warn = params.warnBelow ?? "1.2";
  if (!/^[0-9]+(\.[0-9]{1,4})?$/.test(warn)) throw new BadInput("warnBelow must be a number such as 1.2");
  const account = getAddress(params.account);
  const block = await provider.getBlockNumber();
  const [collateral, debt, available, , , hf] = await pool.getUserAccountData(account, { blockTag: block });
  const warnWad = BigInt(warn.split(".")[0]) * 10n ** 18n + BigInt((warn.split(".")[1] ?? "").padEnd(18, "0"));
  const hasDebt = debt > 0n;
  return {
    block,
    account,
    collateralUsd: dec(collateral, 8, 2),
    debtUsd: dec(debt, 8, 2),
    availableToBorrowUsd: dec(available, 8, 2),
    healthFactor: hasDebt && hf !== MAX ? dec(hf, 18, 4) : null,
    warnBelow: warn,
    atRisk: hasDebt && hf < warnWad,
    summary: !hasDebt ? (collateral > 0n ? "No borrowing on this account, so it cannot be liquidated." : "This account has no position on Aave on X Layer.")
      : hf < 10n ** 18n ? "This position can be liquidated now."
      : hf < warnWad ? `Health is ${dec(hf, 18, 2)}, below your warning level of ${warn}.`
      : `Health is ${dec(hf, 18, 2)}, above your warning level of ${warn}.`,
  };
}

export class BadInput extends Error {}
