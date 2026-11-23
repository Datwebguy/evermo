// TAP-13 signed response envelopes.
import { concat, getBytes, keccak256, toUtf8Bytes, Wallet, verifyMessage, zeroPadValue, toBeHex, Signature } from "ethers";
import { canonicalJSON } from "./canonical.ts";

const DOMAIN = toUtf8Bytes("TAPI-1/resp/v2");
const k = (s: string) => keccak256(toUtf8Bytes(s));

export type Envelope = {
  id: string; ok: boolean; result?: unknown; error?: { code: string; message: string };
  container: string; ts: number; block?: number; sig: string;
};

export function digest(container: string, id: string, method: string, params: unknown, ok: boolean, body: unknown, ts: number): string {
  const pre = concat([
    DOMAIN, getBytes(container), k(id), k(canonicalJSON({ method, params })),
    new Uint8Array([ok ? 1 : 0]), k(canonicalJSON(body)), zeroPadValue(toBeHex(ts), 8),
  ]);
  if (getBytes(pre).length !== 139) throw new Error("bad preimage length");
  return keccak256(pre);
}

export async function sign(wallet: Wallet, container: string, id: string, method: string, params: unknown,
  outcome: { ok: true; result: unknown } | { ok: false; error: { code: string; message: string } }, ts = Math.floor(Date.now() / 1000)): Promise<Envelope> {
  const body = outcome.ok ? outcome.result : outcome.error;
  const d = digest(container, id, method, params, outcome.ok, body, ts);
  const sig = Signature.from(await wallet.signMessage(getBytes(d))).serialized; // ethers normalises to low-s
  return outcome.ok ? { id, ok: true, result: outcome.result, container, ts, sig } : { id, ok: false, error: outcome.error, container, ts, sig };
}

export function recover(env: Envelope, method: string, params: unknown): string {
  const body = env.ok ? env.result : env.error;
  return verifyMessage(getBytes(digest(env.container, env.id, method, params, env.ok, body, env.ts)), env.sig);
}
