// Wallet connection: OKX Wallet first, then any wallet the browser provides (EIP-1193 / EIP-6963).
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import { dep } from "./deployment";

type Announced = { info: { name: string; icon: string; rdns: string }; provider: Eip1193Provider };
const announced: Announced[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e: any) => {
    if (!announced.some((a) => a.info.rdns === e.detail.info.rdns)) announced.push(e.detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function wallets(): { name: string; icon?: string; provider: Eip1193Provider }[] {
  const w = window as any;
  const list: { name: string; icon?: string; provider: Eip1193Provider }[] = [];
  const okx = announced.find((a) => a.info.rdns === "com.okex.wallet")?.provider ?? w.okxwallet;
  if (okx) list.push({ name: "OKX Wallet", icon: announced.find((a) => a.info.rdns === "com.okex.wallet")?.info.icon, provider: okx });
  for (const a of announced) if (a.info.rdns !== "com.okex.wallet") list.push({ name: a.info.name, icon: a.info.icon, provider: a.provider });
  if (!list.length && w.ethereum) list.push({ name: "Browser wallet", provider: w.ethereum });
  return list;
}

export class WalletError extends Error {}

/** Plain words for what a wallet or the chain answered. */
export function explain(e: any): string {
  const code = e?.code ?? e?.info?.error?.code ?? e?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return "You declined in your wallet. Nothing was sent.";
  if (e instanceof WalletError) return e.message;
  const m = String(e?.shortMessage ?? e?.reason ?? e?.message ?? "");
  if (/insufficient funds/i.test(m)) return "Your wallet does not have enough OKB to pay the network fee.";
  if (/InsufficientBudget/.test(m)) return "The agent's budget is too low for this.";
  if (/NotActive/.test(m)) return "This listing has ended or was already bought.";
  if (/NotHolder|NotSeller/.test(m)) return "Only the agent's owner can do this.";
  if (/transfer amount exceeds balance|exceeds balance/i.test(m)) return "Your wallet does not have enough of this token.";
  return "That did not go through. Please try again.";
}

export async function connect(p: Eip1193Provider): Promise<{ signer: JsonRpcSigner; address: string; provider: Eip1193Provider }> {
  await p.request({ method: "eth_requestAccounts" });
  await ensureChain(p);
  const bp = new BrowserProvider(p, dep().chainId);
  const signer = await bp.getSigner();
  return { signer, address: await signer.getAddress(), provider: p };
}

export async function ensureChain(p: Eip1193Provider) {
  const hex = "0x" + dep().chainId.toString(16);
  const now = await p.request({ method: "eth_chainId" });
  if (now === hex) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (e: any) {
    if (e?.code !== 4902) throw new WalletError("Please switch your wallet to X Layer.");
    await p.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: "X Layer", rpcUrls: [dep().rpc],
      nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, blockExplorerUrls: [dep().explorer] }] });
  }
}
