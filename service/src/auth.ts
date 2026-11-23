// Requests made by an agent's owner carry the owner's signature over the request, so only the owner can spend the agent's budget.
import { concat, getBytes, keccak256, toUtf8Bytes, verifyMessage } from "ethers";
import { canonicalJSON } from "./canonical.ts";

export const OWNER_HEADER = "x-evermo-owner-sig";
export function ownerDigest(agentId: string, id: string, method: string, params: unknown, ts: number): string {
  return keccak256(concat([toUtf8Bytes("Evermo/owner-call/v1"), getBytes(agentId), keccak256(toUtf8Bytes(id)),
    keccak256(toUtf8Bytes(canonicalJSON({ method, params }))), toUtf8Bytes(String(ts))]));
}
/** Returns the signer of an owner call, or null. Signatures older than 10 minutes are refused. */
export function ownerOfCall(header: string | undefined, agentId: string, id: string, method: string, params: unknown): string | null {
  if (!header) return null;
  const [tsStr, sig] = header.split(".");
  const ts = Number(tsStr);
  if (!Number.isSafeInteger(ts) || Math.abs(Date.now() / 1000 - ts) > 600 || !/^0x[0-9a-fA-F]{130}$/.test(sig ?? "")) return null;
  try { return verifyMessage(getBytes(ownerDigest(agentId, id, method, params, ts)), sig); } catch { return null; }
}
