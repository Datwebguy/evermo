import type { AgentCard } from "../service/api";
import { money, short, ago } from "../chain/format";
import { Roll } from "./kit/Roll";

export function AgentTile({ a, me }: { a: AgentCard; me?: string | null }) {
  const mine = me && a.owner.toLowerCase() === me.toLowerCase();
  return (
    <a href={`#/agent/${a.agentId}`} className="card pad enter" style={{ textDecoration: "none", display: "grid", gap: 14 }}>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="h2" data-notr={a.name ? "" : undefined}>{a.name ?? `Agent ${short(a.agentId)}`}</div>
          <div className="muted small" style={{ marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {a.description ?? "This agent's description is not available right now."}</div>
        </div>
        {a.listing ? <span className="pill brand">For sale</span> : mine ? <span className="pill ok">Yours</span> : null}
      </div>
      <div className="row" style={{ alignItems: "flex-end", gap: 18 }}>
        <div><div className="big num"><Roll>{String(a.record.work)}</Roll></div><div className="label">jobs done</div></div>
        <div className="small muted num" style={{ paddingBottom: 3 }}>{a.record.payments} paid · {a.record.blocked} refused · {a.record.sales} sales</div>
      </div>
      <div className="between small">
        <span className="faint">{a.listing ? money(a.listing.price, a.listing.token) : `Owner ${short(a.owner)}`}</span>
        <span className="faint">Active {ago(a.lastActivity)}</span>
      </div>
    </a>
  );
}
