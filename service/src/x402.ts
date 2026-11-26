// x402 (version 2, "exact" scheme, EIP-3009 on USDT0 on X Layer), in the message format of OKX's payments SDK.
//
// As a seller, an agent asks for a price per call and is paid straight to its current owner. Payments are verified and
// settled by OKX's facilitator when an OKX API key is configured; without one, the service verifies the signed
// authorization itself and submits it on chain.
// As a buyer, an agent pays from its budget: the budget circuit first decides on the real seller (AgentBudget.payThrough),
// then the operator signs the authorization with the amount it was given.
import { createHmac, randomBytes } from "node:crypto";
import { Contract, Signature, Wallet, getAddress, verifyTypedData, type Provider } from "ethers";

export const X402_VERSION = 2;
export const NETWORK = "eip155:196";
export const USDT0 = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
// USDT0's EIP-712 domain, checked against its DOMAIN_SEPARATOR on X Layer.
export const USDT0_DOMAIN = { name: "USD₮0", version: "1" };
const AUTH_TYPES = { TransferWithAuthorization: [
  { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
  { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] };

export type Requirements = { scheme: "exact"; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number; extra: Record<string, unknown> };
export type PaymentRequired = { x402Version: number; error?: string; resource: { url: string; description?: string; mimeType?: string }; accepts: Requirements[] };
export type Authorization = { from: string; to: string; value: string; validAfter: string; validBefore: string; nonce: string };
export type PaymentPayload = { x402Version: number; resource?: PaymentRequired["resource"]; accepted: Requirements; payload: { authorization: Authorization; signature: string } };
export type SettleResponse = { success: boolean; status?: string; errorReason?: string; payer?: string; transaction: string; network: string; amount?: string };

export const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64");
export const decode = <T,>(h: string): T => JSON.parse(Buffer.from(h, "base64").toString("utf8"));

export function requirements(payTo: string, amount: bigint, timeout = 300): Requirements {
  return { scheme: "exact", network: NETWORK, asset: USDT0, amount: amount.toString(), payTo: getAddress(payTo), maxTimeoutSeconds: timeout, extra: { ...USDT0_DOMAIN } };
}

// ---------- Seller ----------

export type Facilitator = {
  verify(p: PaymentPayload, r: Requirements): Promise<{ isValid: boolean; invalidReason?: string; payer?: string }>;
  settle(p: PaymentPayload, r: Requirements): Promise<SettleResponse>;
  name: string;
};

/** OKX's facilitator (gasless for the buyer), signed with the OKX API key. */
export function okxFacilitator(c: { apiKey: string; secretKey: string; passphrase: string; baseUrl?: string }): Facilitator {
  const base = c.baseUrl ?? "https://web3.okx.com";
  const call = async (path: string, bodyObj: unknown) => {
    const body = JSON.stringify(bodyObj), ts = new Date().toISOString();
    const sign = createHmac("sha256", c.secretKey).update(ts + "POST" + path + body).digest("base64");
    const r = await fetch(base + path, { method: "POST", body, signal: AbortSignal.timeout(30000), headers: {
      "OK-ACCESS-KEY": c.apiKey, "OK-ACCESS-SIGN": sign, "OK-ACCESS-TIMESTAMP": ts, "OK-ACCESS-PASSPHRASE": c.passphrase, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(`OKX facilitator ${path} answered ${r.status}`);
    const j: any = await r.json(); return j.data ?? j;
  };
  return {
    name: "OKX",
    verify: (p, r) => call("/api/v6/pay/x402/verify", { x402Version: X402_VERSION, paymentPayload: p, paymentRequirements: r }),
    settle: (p, r) => call("/api/v6/pay/x402/settle", { x402Version: X402_VERSION, paymentPayload: p, paymentRequirements: r, syncSettle: true }),
  };
}

/** Without an OKX key: the service checks the authorization itself and submits it to USDT0 (the service pays the gas). */
export function localFacilitator(submitter: Wallet, provider: Provider): Facilitator {
  const usdt = new Contract(USDT0, ["function authorizationState(address,bytes32) view returns (bool)", "function balanceOf(address) view returns (uint256)",
    "function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)"], provider);
  const verify = async (p: PaymentPayload, r: Requirements) => {
    const a = p?.payload?.authorization, sig = p?.payload?.signature;
    if (!a || typeof sig !== "string") return { isValid: false, invalidReason: "missing_authorization" };
    if (p.x402Version !== X402_VERSION || p.accepted?.scheme !== "exact" || p.accepted?.network !== NETWORK) return { isValid: false, invalidReason: "unsupported_scheme" };
    let signer: string;
    try { signer = verifyTypedData({ ...USDT0_DOMAIN, chainId: 196, verifyingContract: USDT0 }, AUTH_TYPES, a, sig); } catch { return { isValid: false, invalidReason: "invalid_signature" }; }
    if (getAddress(signer) !== getAddress(a.from)) return { isValid: false, invalidReason: "invalid_signature" };
    if (getAddress(a.to) !== getAddress(r.payTo)) return { isValid: false, invalidReason: "wrong_payee" };
    if (BigInt(a.value) < BigInt(r.amount)) return { isValid: false, invalidReason: "insufficient_amount" };
    const now = Math.floor(Date.now() / 1000);
    if (Number(a.validAfter) > now || Number(a.validBefore) < now + 5) return { isValid: false, invalidReason: "expired" };
    if (await usdt.authorizationState(a.from, a.nonce)) return { isValid: false, invalidReason: "nonce_used" };
    if ((await usdt.balanceOf(a.from)) < BigInt(a.value)) return { isValid: false, invalidReason: "insufficient_funds" };
    return { isValid: true, payer: getAddress(a.from) };
  };
  return {
    name: "Evermo",
    verify,
    settle: async (p, r) => {
      const v = await verify(p, r);
      if (!v.isValid) return { success: false, errorReason: v.invalidReason, transaction: "", network: NETWORK };
      const a = p.payload.authorization;
      const tx = await (usdt.connect(submitter) as Contract).transferWithAuthorization(a.from, a.to, a.value, a.validAfter, a.validBefore, a.nonce, p.payload.signature);
      const rc = await tx.wait();
      return { success: rc?.status === 1, status: rc?.status === 1 ? "success" : "failed", payer: v.payer, transaction: tx.hash, network: NETWORK, amount: a.value };
    },
  };
}

// ---------- Buyer ----------

/** Signs the "exact" payload for one set of requirements. */
export async function signPayment(signer: Wallet, req: Requirements, resource: PaymentRequired["resource"] | undefined, nonce = "0x" + randomBytes(32).toString("hex")): Promise<PaymentPayload> {
  const now = Math.floor(Date.now() / 1000); // valid from 10 minutes ago: chain clocks can run behind wall time
  const authorization: Authorization = { from: signer.address, to: getAddress(req.payTo), value: req.amount, validAfter: String(now - 600),
    validBefore: String(now + Math.max(60, req.maxTimeoutSeconds)), nonce };
  const name = String(req.extra?.name ?? USDT0_DOMAIN.name), version = String(req.extra?.version ?? USDT0_DOMAIN.version);
  const signature = Signature.from(await signer.signTypedData({ name, version, chainId: 196, verifyingContract: getAddress(req.asset) }, AUTH_TYPES, authorization)).serialized;
  return { x402Version: X402_VERSION, resource, accepted: req, payload: { authorization, signature } };
}

/** Picks the requirement this service can pay: exact, X Layer, USDT0. */
export function pick(pr: PaymentRequired): Requirements | null {
  return pr.accepts?.find((a) => a.scheme === "exact" && a.network === NETWORK && getAddress(a.asset) === getAddress(USDT0)) ?? null;
}
