import { CheckCircle, XCircle, Plus, Tag, Wallet, Coins, ArrowsLeftRight, Prohibit, ShieldCheck, Stop } from "@phosphor-icons/react";
import type { Item } from "../service/api";
import { describe } from "../words";
import { ago } from "../chain/format";
import { TxLink } from "./parts";

const icons: Record<string, any> = { work: CheckCircle, pay: Coins, refuse: XCircle, add: Plus, list: Tag, sale: ArrowsLeftRight, deposit: Wallet, withdraw: Wallet, cancel: Prohibit, perm: ShieldCheck, stop: Stop };

export function Feed({ items, names, limit = 50 }: { items: Item[]; names?: Map<string, string>; limit?: number }) {
  const lines = items.map((it) => ({ it, l: describe(it) })).filter((x) => x.l).slice(0, limit);
  if (!lines.length) return <div className="hint" style={{ padding: "12px 0" }}>Nothing has happened yet.</div>;
  return (
    <div className="list">
      {lines.map(({ it, l }) => {
        const I = icons[l!.kind] ?? CheckCircle;
        const who = names && it.agentId ? names.get(it.agentId) : null;
        return (
          <div key={`${it.tx}-${it.logIndex}`} className="item enter">
            <span className={`ico ${l!.tone}`}><I size={18} weight="bold" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550 }}>{who ? <><a className="link" data-notr href={`#/agent/${it.agentId}`}>{who}</a> · </> : null}{l!.text}</div>
              <div className="faint small">{ago(it.time)} · <TxLink tx={it.tx} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
