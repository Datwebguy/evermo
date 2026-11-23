import { useEffect, useState } from "react";
import { type Contract } from "ethers";
import { market, erc20, marketAbi } from "../chain/read";
import { dep, tokenBy } from "../chain/deployment";
import { money } from "../chain/format";
import { Interface } from "ethers";
import type { AgentCard } from "../service/api";
import { useWallet } from "../state";
import { Sheet, TxLink, Notice } from "../ui/parts";
import { Roll } from "../ui/kit/Roll";
import { useStep, confirm } from "./useStep";

export function Buy({ a, onClose, onDone }: { a: AgentCard; onClose: () => void; onDone: () => void }) {
  const [l] = useState(a.listing!); // kept as bought: the listing ends when the purchase goes through
  const { ask, address } = useWallet();
  const s = useStep();
  const [terms, setTerms] = useState<{ fee: bigint; royalty: bigint; resale: boolean } | null>(null);
  const [sold, setSold] = useState<{ toSeller: bigint; royalty: bigint; fee: bigint; burned: bigint; tx: string } | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => { (async () => {
    const m = market();
    const [fee, roy, before] = await Promise.all([m.FEE_BPS(), m.ROYALTY_BPS(), m.soldBefore(a.agentId)]);
    setTerms({ fee, royalty: roy, resale: before });
  })().catch(() => s.setError("The sale terms could not be read right now.")); }, [a.agentId]);

  useEffect(() => { if (!sold) return; const t = [1, 2, 3, 4].map((n) => setTimeout(() => setShown(n), n * 450)); return () => t.forEach(clearTimeout); }, [sold]);

  const price = BigInt(l.price);
  const fee = terms ? (price * terms.fee) / 10000n : 0n;
  const roy = terms?.resale ? (price * terms.royalty) / 10000n : 0n;
  const isBem = l.token.toLowerCase() === dep().tokens.find((t) => t.symbol === "BEM")?.address.toLowerCase();
  const own = address && address.toLowerCase() === l.seller.toLowerCase();

  async function buy() {
    const signer = await ask(); if (!signer) return;
    const tok = erc20(l.token).connect(signer) as Contract;
    const me = await signer.getAddress();
    if ((await tok.balanceOf(me)) < price) return s.setError(`You need ${money(price, l.token)} in your wallet.`);
    if ((await tok.allowance(me, dep().market)) < price) { if (!(await s.go("approve", async () => confirm(await tok.approve(dep().market, price))))) return; }
    const r = await s.go("buy", async () => confirm(await (market().connect(signer) as Contract).buy(l.id)));
    if (!r) return;
    const iface = new Interface(marketAbi);
    const ev = r.logs.map((x: any) => { try { return iface.parseLog(x); } catch { return null; } }).find((x: any) => x?.name === "Sold");
    setSold({ toSeller: ev.args.toSeller, royalty: ev.args.royalty, fee: ev.args.fee, burned: ev.args.burned, tx: r.hash });
    onDone();
  }

  const rows: [string, bigint][] = sold
    ? [["Seller", sold.toSeller], ["Builder royalty", sold.royalty], ["Evermo fee", sold.fee - sold.burned], ["Burned", sold.burned]]
    : [["Seller", price - fee - roy], ["Builder royalty", roy], ["Evermo fee", isBem ? fee - fee / 2n : fee], ["Burned", isBem ? fee / 2n : 0n]];

  return (
    <Sheet title={sold ? "It's yours" : `Buy ${a.name ?? "this agent"}`} onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <div className="label">{sold ? "You paid" : "Price"}</div>
        <div className="big num">{money(price, l.token)}</div>
      </div>
      <div className="card pad stack" style={{ boxShadow: "none", gap: 10 }}>
        <div className="label">{sold ? "Paid out in the same transaction" : "Where the money goes"}</div>
        {rows.filter(([, v], i) => i === 0 || v > 0n).map(([k, v], i) => (
          <div key={k} className="between" style={{ opacity: sold && shown <= i ? 0.25 : 1, transition: "opacity .35s" }}>
            <span className="muted">{k}</span><b className="num">{sold && shown <= i ? money(0n, l.token) : <Roll>{money(v, l.token)}</Roll>}</b>
          </div>))}
        {!sold && terms && !terms.resale && <div className="hint">First sale: no builder royalty is due.</div>}
        {!sold && isBem && <div className="hint">Half of Evermo's fee on BEM sales goes to the burn address.</div>}
      </div>
      {sold ? <>
        <TxLink tx={sold.tx} />
        <Notice tone="ok">Next, switch your agent on: give it a budget and limits so it can work for you.</Notice>
        <button className="btn primary wide" onClick={onClose}>Switch it on</button>
      </> : own ? <Notice>This is your listing.</Notice> : <>
        {s.error && <div className="error">{s.error}</div>}
        <button className="btn primary wide" disabled={!!s.busy || !terms} onClick={buy}>
          {s.busy === "approve" ? `Allowing ${tokenBy(l.token)?.symbol}…` : s.busy === "buy" ? "Buying…" : `Buy for ${money(price, l.token)}`}
        </button>
        <div className="hint">The agent comes to your wallet as soon as the payment goes through. Everything happens in one transaction.</div>
      </>}
    </Sheet>
  );
}
