// The connected wallet, shared by every screen.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Eip1193Provider, JsonRpcSigner } from "ethers";
import { connect, explain, wallets } from "./chain/wallet";
import { Sheet, Notice } from "./ui/parts";

type W = { address: string | null; signer: JsonRpcSigner | null; provider: Eip1193Provider | null; ask: () => Promise<JsonRpcSigner | null>; disconnect: () => void };
const Ctx = createContext<W>(null as any);
export const useWallet = () => useContext(Ctx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<{ address: string; signer: JsonRpcSigner; provider: Eip1193Provider } | null>(null);
  const [picking, setPicking] = useState<((v: JsonRpcSigner | null) => void) | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!s) return;
    const p: any = s.provider;
    const off = () => setS(null);
    p.on?.("accountsChanged", off); p.on?.("chainChanged", off);
    return () => { p.removeListener?.("accountsChanged", off); p.removeListener?.("chainChanged", off); };
  }, [s]);

  const ask = useCallback(() => s ? Promise.resolve(s.signer) : new Promise<JsonRpcSigner | null>((res) => { setErr(""); setPicking(() => res); }), [s]);
  const close = (v: JsonRpcSigner | null) => { picking?.(v); setPicking(null); };
  const list = picking ? wallets() : [];

  return (
    <Ctx.Provider value={{ address: s?.address ?? null, signer: s?.signer ?? null, provider: s?.provider ?? null, ask, disconnect: () => setS(null) }}>
      {children}
      {picking && (
        <Sheet title="Connect a wallet" onClose={() => close(null)}>
          {list.length === 0 ? (
            <Notice>No wallet found in this browser. Install OKX Wallet, or open Evermo in your wallet's browser, then try again.
              <div style={{ marginTop: 10 }}><a className="link" href="https://www.okx.com/web3" target="_blank" rel="noreferrer">Get OKX Wallet</a></div></Notice>
          ) : list.map((w) => (
            <button key={w.name} className="btn wide" disabled={busy} style={{ justifyContent: "flex-start", minHeight: 56 }} onClick={async () => {
              setBusy(true); setErr("");
              try { const c = await connect(w.provider); setS(c); picking?.(c.signer); setPicking(null); }
              catch (e) { setErr(explain(e)); }
              finally { setBusy(false); }
            }}>
              {w.icon ? <img src={w.icon} alt="" width={28} height={28} style={{ borderRadius: 8 }} /> : <span className="ico" style={{ width: 28, height: 28 }} />}
              {w.name}
            </button>
          ))}
          {err && <div className="error">{err}</div>}
          <div className="hint">Evermo runs on X Layer. Your wallet will be asked to switch to it.</div>
        </Sheet>
      )}
    </Ctx.Provider>
  );
}
